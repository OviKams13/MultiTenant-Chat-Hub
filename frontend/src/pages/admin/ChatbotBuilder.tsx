import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Phone, HelpCircle, Clock, Pencil, Trash2, Plus } from "lucide-react";

type BlockType = "CONTACT" | "FAQ" | "SCHEDULE";

interface ContactData { id?: string; entity_id: string; org_name: string; phone: string; email: string; address_text: string; city: string; country: string; hours_text: string; }
interface FaqData { id?: string; entity_id: string; question: string; answer: string; }
interface ScheduleData { id?: string; entity_id: string; title: string; day_of_week: string; open_time: string; close_time: string; notes: string; }

const ChatbotBuilder = () => {
  const { id: chatbotId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [shopName, setShopName] = useState("");
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [faqs, setFaqs] = useState<FaqData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [activeForm, setActiveForm] = useState<{ type: BlockType; data?: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!chatbotId) return;
    const { data: bot } = await supabase.from("chatbots").select("display_name").eq("id", chatbotId).single();
    if (bot) setShopName(bot.display_name);

    const { data: items } = await supabase
      .from("chatbot_items")
      .select("entity_id, bb_entities(id, entity_type)")
      .eq("chatbot_id", chatbotId);

    if (!items) return;
    const entityIds = items.map(i => i.entity_id);
    if (entityIds.length === 0) { setContacts([]); setFaqs([]); setSchedules([]); return; }

    const [cRes, fRes, sRes] = await Promise.all([
      supabase.from("bb_contacts").select("*").in("entity_id", entityIds),
      supabase.from("bb_faqs").select("*").in("entity_id", entityIds),
      supabase.from("bb_schedules").select("*").in("entity_id", entityIds),
    ]);
    setContacts((cRes.data as ContactData[]) || []);
    setFaqs((fRes.data as FaqData[]) || []);
    setSchedules((sRes.data as ScheduleData[]) || []);
  }, [chatbotId]);

  useEffect(() => { loadData(); }, [loadData]);

  const createEntity = async (type: BlockType) => {
    const { data: entity, error: eErr } = await supabase.from("bb_entities").insert({ entity_type: type }).select().single();
    if (eErr || !entity) throw eErr;
    const { error: ciErr } = await supabase.from("chatbot_items").insert({ chatbot_id: chatbotId!, entity_id: entity.id });
    if (ciErr) throw ciErr;
    return entity.id;
  };

  const saveContact = async (form: any) => {
    setSaving(true);
    try {
      if (form.id) {
        await supabase.from("bb_contacts").update({ org_name: form.org_name, phone: form.phone, email: form.email, address_text: form.address_text, city: form.city, country: form.country, hours_text: form.hours_text }).eq("id", form.id);
      } else {
        const entityId = await createEntity("CONTACT");
        await supabase.from("bb_contacts").insert({ entity_id: entityId, ...form });
      }
      toast({ title: "Contact saved!" });
      setActiveForm(null);
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const saveFaq = async (form: any) => {
    setSaving(true);
    try {
      if (form.id) {
        await supabase.from("bb_faqs").update({ question: form.question, answer: form.answer }).eq("id", form.id);
      } else {
        const entityId = await createEntity("FAQ");
        await supabase.from("bb_faqs").insert({ entity_id: entityId, question: form.question, answer: form.answer });
      }
      toast({ title: "FAQ saved!" });
      setActiveForm(null);
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const saveSchedule = async (form: any) => {
    setSaving(true);
    try {
      if (form.id) {
        await supabase.from("bb_schedules").update({ title: form.title, day_of_week: form.day_of_week, open_time: form.open_time, close_time: form.close_time, notes: form.notes }).eq("id", form.id);
      } else {
        const entityId = await createEntity("SCHEDULE");
        await supabase.from("bb_schedules").insert({ entity_id: entityId, title: form.title, day_of_week: form.day_of_week, open_time: form.open_time, close_time: form.close_time, notes: form.notes });
      }
      toast({ title: "Schedule saved!" });
      setActiveForm(null);
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteBlock = async (type: string, entityId: string) => {
    await supabase.from("bb_entities").delete().eq("id", entityId);
    toast({ title: "Block deleted" });
    loadData();
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Builder — {shopName}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Blocks palette */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Blocks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveForm({ type: "CONTACT" })}>
                <Phone className="h-4 w-4 text-primary" /> Add Contact
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveForm({ type: "FAQ" })}>
                <HelpCircle className="h-4 w-4 text-primary" /> Add FAQ
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveForm({ type: "SCHEDULE" })}>
                <Clock className="h-4 w-4 text-primary" /> Add Schedule
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Content overview */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Current Content</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Contacts */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><Phone className="h-4 w-4" /> Contact</h3>
                {contacts.length === 0 ? <p className="text-xs text-muted-foreground">No contact info yet</p> : contacts.map(c => (
                  <div key={c.id} className="rounded-md border p-3 mb-2 text-sm">
                    <p className="font-medium">{c.org_name}</p>
                    <p className="text-muted-foreground">{c.phone} · {c.email}</p>
                    <p className="text-muted-foreground">{c.address_text}, {c.city}, {c.country}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setActiveForm({ type: "CONTACT", data: c })}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteBlock("CONTACT", c.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              {/* FAQs */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><HelpCircle className="h-4 w-4" /> FAQs</h3>
                {faqs.length === 0 ? <p className="text-xs text-muted-foreground">No FAQs yet</p> : faqs.map(f => (
                  <div key={f.id} className="rounded-md border p-3 mb-2 text-sm">
                    <p className="font-medium">{f.question}</p>
                    <p className="text-muted-foreground">{f.answer}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setActiveForm({ type: "FAQ", data: f })}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteBlock("FAQ", f.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              {/* Schedules */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><Clock className="h-4 w-4" /> Schedules</h3>
                {schedules.length === 0 ? <p className="text-xs text-muted-foreground">No schedules yet</p> : schedules.map(s => (
                  <div key={s.id} className="rounded-md border p-3 mb-2 text-sm">
                    <p className="font-medium">{s.day_of_week}: {s.open_time} – {s.close_time}</p>
                    {s.notes && <p className="text-muted-foreground">{s.notes}</p>}
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setActiveForm({ type: "SCHEDULE", data: s })}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteBlock("SCHEDULE", s.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Block form */}
        <div className="lg:col-span-4">
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
    id: data?.id || "", entity_id: data?.entity_id || "", org_name: data?.org_name || "", phone: data?.phone || "",
    email: data?.email || "", address_text: data?.address_text || "", city: data?.city || "", country: data?.country || "", hours_text: data?.hours_text || "",
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

function FaqForm({ data, onSave, onCancel, saving }: { data?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({ id: data?.id || "", entity_id: data?.entity_id || "", question: data?.question || "", answer: data?.answer || "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
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

function ScheduleForm({ data, onSave, onCancel, saving }: { data?: any; onSave: (d: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    id: data?.id || "", entity_id: data?.entity_id || "", title: data?.title || "",
    day_of_week: data?.day_of_week || "Monday", open_time: data?.open_time || "09:00", close_time: data?.close_time || "18:00", notes: data?.notes || "",
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
        <div><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} placeholder="Closed on holidays" /></div>
        <div className="flex gap-2"><Button onClick={() => onSave(form)} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
      </CardContent>
    </Card>
  );
}

export default ChatbotBuilder;
