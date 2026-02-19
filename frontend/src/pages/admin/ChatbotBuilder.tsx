import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, BlockType, DynamicBlockInstance, ScheduleBlock } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Phone, HelpCircle, Clock, Pencil, Trash2, Plus } from "lucide-react";

type BlockFormType = "CONTACT" | "FAQ" | "SCHEDULE";
interface FaqFormData { entity_id?: number; question: string; answer: string; }

const FAQ_SCHEMA = {
  label: "FAQ",
  fields: [
    { name: "question", label: "Question", type: "string", required: true },
    { name: "answer", label: "Answer", type: "string", required: true },
  ],
};

const ChatbotBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const chatbotId = Number(id);
  const { token } = useAuth();
  const { toast } = useToast();

  const [shopName, setShopName] = useState("");
  const [contact, setContact] = useState<any | null>(null);
  const [faqs, setFaqs] = useState<FaqFormData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [faqType, setFaqType] = useState<BlockType | null>(null);
  const [activeForm, setActiveForm] = useState<{ type: BlockFormType; data?: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !chatbotId) return;

    const bot = await adminApi.getChatbot(chatbotId, token);
    setShopName(bot.display_name);

    const [schedulesData, blockTypes] = await Promise.all([
      adminApi.listSchedules(chatbotId, token),
      adminApi.listBlockTypes(chatbotId, token),
    ]);
    setSchedules(schedulesData);

    const faqBlockType = blockTypes.find((item) => item.type_name.toUpperCase() === "FAQ") ?? null;
    setFaqType(faqBlockType);

    if (faqBlockType) {
      const faqInstances = await adminApi.listDynamicInstances(chatbotId, faqBlockType.type_id, token);
      setFaqs(
        faqInstances.map((instance: DynamicBlockInstance) => ({
          entity_id: instance.entity_id,
          question: String(instance.data.question ?? ""),
          answer: String(instance.data.answer ?? ""),
        }))
      );
    } else {
      setFaqs([]);
    }

    try {
      const contactData = await adminApi.getContact(chatbotId, token);
      setContact(contactData);
    } catch {
      setContact(null);
    }
  }, [token, chatbotId]);

  useEffect(() => {
    loadData().catch((error: Error) => {
      toast({ title: "Failed to load builder", description: error.message, variant: "destructive" });
    });
  }, [loadData, toast]);

  const ensureFaqType = async (): Promise<BlockType> => {
    if (!token) throw new Error("Missing auth token");
    if (faqType) return faqType;

    const createdType = await adminApi.createBlockType(
      chatbotId,
      { type_name: "FAQ", description: "Frequently asked questions", schema_definition: FAQ_SCHEMA },
      token
    );
    setFaqType(createdType);
    return createdType;
  };

  const saveContact = async (form: any) => {
    if (!token) return;
    setSaving(true);
    try {
      if (contact) {
        await adminApi.updateContact(chatbotId, form, token);
      } else {
        await adminApi.createContact(chatbotId, form, token);
      }
      toast({ title: "Contact saved!" });
      setActiveForm(null);
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveFaq = async (form: FaqFormData) => {
    if (!token) return;
    setSaving(true);
    try {
      const type = await ensureFaqType();
      const payload = { data: { question: form.question, answer: form.answer } };
      if (form.entity_id) {
        await adminApi.updateDynamicInstance(chatbotId, type.type_id, form.entity_id, payload, token);
      } else {
        await adminApi.createDynamicInstance(chatbotId, type.type_id, payload, token);
      }
      toast({ title: "FAQ saved!" });
      setActiveForm(null);
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveSchedule = async (form: any) => {
    if (!token) return;
    setSaving(true);
    try {
      if (form.entity_id) {
        await adminApi.updateSchedule(chatbotId, form.entity_id, form, token);
      } else {
        await adminApi.createSchedule(chatbotId, form, token);
      }
      toast({ title: "Schedule saved!" });
      setActiveForm(null);
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async (entityId: number) => {
    if (!token || !faqType) return;
    await adminApi.deleteDynamicInstance(chatbotId, faqType.type_id, entityId, token);
    toast({ title: "FAQ deleted" });
    await loadData();
  };

  const deleteSchedule = async (entityId: number) => {
    if (!token) return;
    await adminApi.deleteSchedule(chatbotId, entityId, token);
    toast({ title: "Schedule deleted" });
    await loadData();
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Builder — {shopName}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader><CardTitle className="text-base">Blocks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => setActiveForm({ type: "CONTACT", data: contact ?? undefined })}><Plus className="h-4 w-4 mr-2" /> {contact ? "Edit Contact" : "Add Contact"}</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setActiveForm({ type: "FAQ" })}><Plus className="h-4 w-4 mr-2" /> Add FAQ</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setActiveForm({ type: "SCHEDULE" })}><Plus className="h-4 w-4 mr-2" /> Add Schedule</Button>

              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><Phone className="h-4 w-4" /> Contact</h3>
                {!contact ? <p className="text-xs text-muted-foreground">No contact yet</p> : (
                  <div className="rounded-md border p-3 mb-2 text-sm">
                    <p className="font-medium">{contact.org_name}</p>
                    <p className="text-muted-foreground">{contact.phone || contact.email || "No phone/email"}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setActiveForm({ type: "CONTACT", data: contact })}><Pencil className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><HelpCircle className="h-4 w-4" /> FAQs</h3>
                {faqs.length === 0 ? <p className="text-xs text-muted-foreground">No FAQs yet</p> : faqs.map((f) => (
                  <div key={f.entity_id} className="rounded-md border p-3 mb-2 text-sm">
                    <p className="font-medium">{f.question}</p>
                    <p className="text-muted-foreground line-clamp-2">{f.answer}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setActiveForm({ type: "FAQ", data: f })}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => f.entity_id && deleteFaq(f.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><Clock className="h-4 w-4" /> Schedules</h3>
                {schedules.length === 0 ? <p className="text-xs text-muted-foreground">No schedules yet</p> : schedules.map((s) => (
                  <div key={s.entity_id} className="rounded-md border p-3 mb-2 text-sm">
                    <p className="font-medium">{s.day_of_week}: {s.open_time} – {s.close_time}</p>
                    {s.notes && <p className="text-muted-foreground">{s.notes}</p>}
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setActiveForm({ type: "SCHEDULE", data: s })}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          {!activeForm ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-16 text-center text-muted-foreground">
                <p>Select a block from the palette to add or edit content</p>
              </CardContent>
            </Card>
          ) : activeForm.type === "CONTACT" ? (
            <ContactForm data={activeForm.data} onSave={saveContact} onCancel={() => setActiveForm(null)} saving={saving} />
          ) : activeForm.type === "FAQ" ? (
            <FaqForm data={activeForm.data} onSave={saveFaq} onCancel={() => setActiveForm(null)} saving={saving} />
          ) : (
            <ScheduleForm data={activeForm.data} onSave={saveSchedule} onCancel={() => setActiveForm(null)} saving={saving} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

function ContactForm({ data, onSave, onCancel, saving }: { data?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    org_name: data?.org_name || "", phone: data?.phone || "", email: data?.email || "", address_text: data?.address_text || "", city: data?.city || "", country: data?.country || "", hours_text: data?.hours_text || "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Contact Block</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Org name</Label><Input value={form.org_name} onChange={set("org_name")} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={set("email")} /></div>
        <div><Label>Address</Label><Input value={form.address_text} onChange={set("address_text")} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>City</Label><Input value={form.city} onChange={set("city")} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={set("country")} /></div>
        </div>
        <div><Label>Opening hours</Label><Textarea value={form.hours_text} onChange={set("hours_text")} /></div>
        <div className="flex gap-2"><Button onClick={() => onSave(form)} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
      </CardContent>
    </Card>
  );
}

function FaqForm({ data, onSave, onCancel, saving }: { data?: FaqFormData; onSave: (d: FaqFormData) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState<FaqFormData>({ entity_id: data?.entity_id, question: data?.question || "", answer: data?.answer || "" });
  const set = (k: "question" | "answer") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">FAQ Block</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Question</Label><Input value={form.question} onChange={set("question")} /></div>
        <div><Label>Answer</Label><Textarea value={form.answer} onChange={set("answer")} rows={4} /></div>
        <div className="flex gap-2"><Button onClick={() => onSave(form)} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
      </CardContent>
    </Card>
  );
}

function ScheduleForm({ data, onSave, onCancel, saving }: { data?: Partial<ScheduleBlock>; onSave: (d: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    entity_id: data?.entity_id,
    title: data?.title || "",
    day_of_week: data?.day_of_week || "Monday",
    open_time: data?.open_time || "09:00",
    close_time: data?.close_time || "18:00",
    notes: data?.notes || "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Schedule Block</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={set("title")} placeholder="Weekday hours" /></div>
        <div>
          <Label>Day of week</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.day_of_week} onChange={set("day_of_week") as any}>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Open</Label><Input type="time" value={form.open_time} onChange={set("open_time")} /></div>
          <div><Label>Close</Label><Input type="time" value={form.close_time} onChange={set("close_time")} /></div>
        </div>
        <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={set("notes")} placeholder="Closed on holidays" /></div>
        <div className="flex gap-2"><Button onClick={() => onSave(form)} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
      </CardContent>
    </Card>
  );
}

export default ChatbotBuilder;
