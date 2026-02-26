import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BlockType, ChatbotItemSummary, DynamicBlockInstance, ScheduleBlock, Tag, adminApi } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Clock, Pencil, Plus, Tags, Trash2, Type } from "lucide-react";

type BuilderDropType = "CONTACT" | "SCHEDULE" | "DYNAMIC_INSTANCE";

type Mode =
  | { type: "NONE" }
  | { type: "CONTACT" }
  | { type: "SCHEDULE"; data?: Partial<ScheduleBlock> }
  | { type: "BLOCK_TYPE"; data?: BlockType }
  | { type: "INSTANCE"; blockType: BlockType; data?: DynamicBlockInstance }
  | { type: "TAGS" };

interface ContactFormData {
  org_name: string;
  phone: string;
  email: string;
  address_text: string;
  city: string;
  country: string;
  hours_text: string;
}

type DynamicFieldType = "string" | "number" | "boolean" | "date" | "select";

interface SchemaField {
  name: string;
  label: string;
  type: DynamicFieldType;
  required: boolean;
  options?: string[];
}

const EMPTY_CONTACT: ContactFormData = {
  org_name: "",
  phone: "",
  email: "",
  address_text: "",
  city: "",
  country: "",
  hours_text: "",
};

function parseSchemaFields(schemaDefinition: Record<string, unknown> | undefined): SchemaField[] {
  const fields = schemaDefinition?.fields;
  if (!Array.isArray(fields)) return [];

  return fields
    .map((field) => {
      if (!field || typeof field !== "object") return null;

      const rawName = (field as Record<string, unknown>).name;
      const rawLabel = (field as Record<string, unknown>).label;
      const rawType = (field as Record<string, unknown>).type;
      const rawRequired = (field as Record<string, unknown>).required;
      const rawOptions = (field as Record<string, unknown>).options;

      if (typeof rawName !== "string" || rawName.trim().length === 0) return null;
      if (typeof rawLabel !== "string" || rawLabel.trim().length === 0) return null;

      const normalizedType =
        rawType === "number" || rawType === "boolean" || rawType === "date" || rawType === "select" ? rawType : "string";

      return {
        name: rawName.trim(),
        label: rawLabel.trim(),
        type: normalizedType,
        required: Boolean(rawRequired),
        options: Array.isArray(rawOptions) ? rawOptions.filter((option): option is string => typeof option === "string") : undefined,
      } satisfies SchemaField;
    })
    .filter((field): field is SchemaField => field !== null);
}

function formatFieldValue(value: unknown, type: DynamicFieldType): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "True" : "False";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const ChatbotBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const chatbotId = Number(id);
  const { token } = useAuth();
  const { toast } = useToast();

  const [shopName, setShopName] = useState("");
  const [contact, setContact] = useState<any | null>(null);
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([]);
  const [instancesByType, setInstancesByType] = useState<Record<number, DynamicBlockInstance[]>>({});
  const [mode, setMode] = useState<Mode>({ type: "NONE" });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !chatbotId) return;

    const [chatbot, schedulesData, types] = await Promise.all([
      adminApi.getChatbot(chatbotId, token),
      adminApi.listSchedules(chatbotId, token),
      adminApi.listBlockTypes(chatbotId, token),
    ]);

    setShopName(chatbot.display_name);
    setSchedules(schedulesData);
    setBlockTypes(types);

    const entries = await Promise.all(
      types.map(async (type) => {
        const rows = await adminApi.listDynamicInstances(chatbotId, type.type_id, token);
        return [type.type_id, rows] as const;
      })
    );

    setInstancesByType(Object.fromEntries(entries));

    try {
      const contactData = await adminApi.getContact(chatbotId, token);
      setContact(contactData);
    } catch {
      setContact(null);
    }
  }, [chatbotId, token]);

  useEffect(() => {
    loadData().catch((error: Error) => {
      toast({ title: "Failed to load builder", description: error.message, variant: "destructive" });
    });
  }, [loadData]);


  const openFromDrop = (value: BuilderDropType) => {
    if (value === "CONTACT") {
      setMode({ type: "CONTACT" });
      return;
    }

    if (value === "SCHEDULE") {
      setMode({ type: "SCHEDULE" });
      return;
    }

    setMode({ type: "BLOCK_TYPE" });
    toast({ title: "Create custom block", description: "Define your block type before adding block data." });
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("builder-drop-type") as BuilderDropType;
    if (!type) return;
    openFromDrop(type);
  };

  const saveContact = async (form: ContactFormData) => {
    if (!token) return;
    setSaving(true);
    try {
      if (contact) {
        await adminApi.updateContact(chatbotId, form, token);
      } else {
        await adminApi.createContact(chatbotId, form, token);
      }
      toast({ title: "Contact saved" });
      setMode({ type: "NONE" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Schedule saved" });
      setMode({ type: "NONE" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveBlockType = async (payload: {
    type_name: string;
    description?: string;
    schema_definition: Record<string, unknown>;
    type_id?: number;
  }) => {
    if (!token) return;
    setSaving(true);
    try {
      if (payload.type_id) {
        await adminApi.updateBlockType(
          chatbotId,
          payload.type_id,
          {
            type_name: payload.type_name,
            description: payload.description,
            schema_definition: payload.schema_definition,
          },
          token
        );
      } else {
        await adminApi.createBlockType(
          chatbotId,
          {
            type_name: payload.type_name,
            description: payload.description,
            schema_definition: payload.schema_definition,
          },
          token
        );
      }
      toast({ title: "Block type saved" });
      setMode({ type: "NONE" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveInstance = async (blockType: BlockType, payload: { entity_id?: number; data: Record<string, unknown> }) => {
    if (!token) return;
    setSaving(true);
    try {
      if (payload.entity_id) {
        await adminApi.updateDynamicInstance(chatbotId, blockType.type_id, payload.entity_id, { data: payload.data }, token);
      } else {
        await adminApi.createDynamicInstance(chatbotId, blockType.type_id, { data: payload.data }, token);
      }
      toast({ title: "Instance saved" });
      setMode({ type: "NONE" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (typeId: number) => {
    if (!token) return;
    try {
      await adminApi.deleteBlockType(chatbotId, typeId, token);
      toast({ title: "Block type deleted" });
      await loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteSchedule = async (entityId: number) => {
    if (!token) return;
    await adminApi.deleteSchedule(chatbotId, entityId, token);
    toast({ title: "Schedule deleted" });
    await loadData();
  };

  const deleteInstance = async (typeId: number, entityId: number) => {
    if (!token) return;
    await adminApi.deleteDynamicInstance(chatbotId, typeId, entityId, token);
    toast({ title: "Instance deleted" });
    await loadData();
  };

  const editType = async (typeId: number) => {
    if (!token) return;
    const full = await adminApi.getBlockType(chatbotId, typeId, token);
    setMode({ type: "BLOCK_TYPE", data: full });
  };

  const editInstance = async (type: BlockType, entityId: number) => {
    if (!token) return;
    const full = await adminApi.getDynamicInstance(chatbotId, type.type_id, entityId, token);
    setMode({ type: "INSTANCE", blockType: type, data: full });
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Builder — {shopName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Drag & drop block palette</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-3">
              {[
                { type: "CONTACT", label: "Contact Block" },
                { type: "SCHEDULE", label: "Schedule Block" },
                { type: "DYNAMIC_INSTANCE", label: "Custom Block" },
              ].map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("builder-drop-type", item.type)}
                  className="rounded-md border bg-muted/30 p-3 text-sm font-medium cursor-grab"
                >
                  {item.label}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card onDrop={onDrop} onDragOver={(e) => e.preventDefault()} className="border-dashed">
            <CardHeader><CardTitle className="text-base">Drop zone</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Drop a block from the palette here to open its form.</CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Static blocks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Contact</p>
                    <p className="text-muted-foreground">{contact ? contact.org_name : "No contact configured"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setMode({ type: "CONTACT" })}>Edit</Button>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Schedules</p>
                  <Button size="sm" variant="outline" onClick={() => setMode({ type: "SCHEDULE" })}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {schedules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No schedules yet</p>
                ) : (
                  schedules.map((s) => (
                    <div key={s.entity_id} className="rounded-md border p-3 mb-2 text-sm">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground">{s.day_of_week}: {s.open_time} - {s.close_time}</p>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="ghost" onClick={() => setMode({ type: "SCHEDULE", data: s })}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Type className="h-4 w-4" /> Custom blocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {blockTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No block types available.</p>
              ) : (
                blockTypes.map((type) => (
                  <div key={type.type_id} className="rounded-md border p-3 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="font-medium">{type.type_name} {type.is_system ? "(system)" : ""}</p>
                        <p className="text-muted-foreground">Scope: {type.scope}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => editType(type.type_id)}><Pencil className="h-3 w-3" /></Button>
                        {!type.is_system && type.scope === "CHATBOT" && (
                          <Button size="sm" variant="ghost" onClick={() => deleteType(type.type_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setMode({ type: "INSTANCE", blockType: type })}>Add block data</Button>
                    </div>
                    {(instancesByType[type.type_id] ?? []).map((instance) => (
                      <div key={instance.entity_id} className="rounded-md border mt-2 p-2">
                        <p className="text-xs font-medium">Entity #{instance.entity_id}</p>
                        <div className="mt-2 space-y-1 text-xs">
                          {parseSchemaFields(type.schema_definition).length > 0 ? (
                            parseSchemaFields(type.schema_definition).map((field) => (
                              <p key={`${instance.entity_id}-${field.name}`} className="text-muted-foreground">
                                <span className="font-medium text-foreground">{field.label}:</span>{" "}
                                {formatFieldValue(instance.data[field.name], field.type)}
                              </p>
                            ))
                          ) : (
                            <pre className="text-[11px] overflow-auto text-muted-foreground">{JSON.stringify(instance.data, null, 2)}</pre>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant="ghost" onClick={() => editInstance(type, instance.entity_id)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteInstance(type.type_id, instance.entity_id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Tags className="h-4 w-4" /> Tags & Item tags routes</CardTitle>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => setMode({ type: "TAGS" })}>Manage tags / item tags</Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          {mode.type === "NONE" && (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-16 text-center text-muted-foreground">
                <p>Select a panel action or drop a block to edit builder content.</p>
              </CardContent>
            </Card>
          )}

          {mode.type === "CONTACT" && (
            <ContactForm
              data={contact ?? EMPTY_CONTACT}
              onSave={saveContact}
              onCancel={() => setMode({ type: "NONE" })}
              saving={saving}
            />
          )}

          {mode.type === "SCHEDULE" && (
            <ScheduleForm data={mode.data} onSave={saveSchedule} onCancel={() => setMode({ type: "NONE" })} saving={saving} />
          )}

          {mode.type === "BLOCK_TYPE" && (
            <BlockTypeForm data={mode.data} onSave={saveBlockType} onCancel={() => setMode({ type: "NONE" })} saving={saving} />
          )}

          {mode.type === "INSTANCE" && (
            <DynamicInstanceForm
              blockType={mode.blockType}
              data={mode.data}
              onSave={(payload) => saveInstance(mode.blockType, payload)}
              onCancel={() => setMode({ type: "NONE" })}
              saving={saving}
            />
          )}

          {mode.type === "TAGS" && token && (
            <TagsForm
              chatbotId={chatbotId}
              token={token}
              onCancel={() => setMode({ type: "NONE" })}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

function ContactForm({
  data,
  onSave,
  onCancel,
  saving,
}: {
  data: ContactFormData;
  onSave: (d: ContactFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ContactFormData>(data);
  const set = (k: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
        <div className="flex gap-2">
          <Button onClick={() => onSave(form)} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleForm({
  data,
  onSave,
  onCancel,
  saving,
}: {
  data?: Partial<ScheduleBlock>;
  onSave: (d: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    entity_id: data?.entity_id,
    title: data?.title || "",
    day_of_week: data?.day_of_week || "Monday",
    open_time: data?.open_time || "09:00",
    close_time: data?.close_time || "18:00",
    notes: data?.notes || "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Schedule Block</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={set("title")} placeholder="Weekday hours" /></div>
        <div>
          <Label>Day of week</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.day_of_week} onChange={set("day_of_week") as any}>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Open</Label><Input type="time" value={form.open_time} onChange={set("open_time")} /></div>
          <div><Label>Close</Label><Input type="time" value={form.close_time} onChange={set("close_time")} /></div>
        </div>
        <div><Label>Notes</Label><Input value={form.notes ?? ""} onChange={set("notes")} placeholder="Closed on holidays" /></div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(form)} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BlockTypeForm({
  data,
  onSave,
  onCancel,
  saving,
}: {
  data?: BlockType;
  onSave: (payload: { type_name: string; description?: string; schema_definition: Record<string, unknown>; type_id?: number }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [typeName, setTypeName] = useState(data?.type_name || "");
  const [description, setDescription] = useState(data?.description || "");
  const [fields, setFields] = useState<SchemaField[]>(() => {
    const parsed = parseSchemaFields(data?.schema_definition);
    return parsed.length > 0 ? parsed : [{ name: "", label: "", type: "string", required: false }];
  });

  const addField = () => {
    setFields((current) => [...current, { name: "", label: "", type: "string", required: false }]);
  };

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateField = <K extends keyof SchemaField>(index: number, key: K, value: SchemaField[K]) => {
    setFields((current) =>
      current.map((field, currentIndex) => (currentIndex === index ? { ...field, [key]: value } : field))
    );
  };

  const normalizedFields = fields
    .map((field) => ({
      ...field,
      name: field.name.trim(),
      label: field.label.trim(),
      options: field.options?.map((option) => option.trim()).filter(Boolean),
    }))
    .filter((field) => field.name.length > 0 && field.label.length > 0);

  const handleSave = () => {
    onSave({
      type_id: data?.type_id,
      type_name: typeName,
      description,
      schema_definition: {
        fields: normalizedFields,
      },
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Block type definition</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Type name</Label><Input value={typeName} onChange={(e) => setTypeName(e.target.value)} /></div>
        <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Schema fields</Label>
            <Button type="button" size="sm" variant="outline" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Add field</Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={`${index}-${field.name}`} className="rounded-md border p-2 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={field.name} placeholder="store_name" onChange={(e) => updateField(index, "name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input value={field.label} placeholder="Store Name" onChange={(e) => updateField(index, "label", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label>Type</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={field.type}
                      onChange={(e) => updateField(index, "type", e.target.value as DynamicFieldType)}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="date">date</option>
                      <option value="select">select</option>
                    </select>
                  </div>
                  <div>
                    <Label>Required</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={field.required ? "true" : "false"}
                      onChange={(e) => updateField(index, "required", e.target.value === "true")}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeField(index)} disabled={fields.length === 1}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>

                {field.type === "select" && (
                  <div>
                    <Label>Options (comma separated)</Label>
                    <Input
                      value={(field.options ?? []).join(", ")}
                      placeholder="Small, Medium, Large"
                      onChange={(e) => updateField(index, "options", e.target.value.split(",").map((value) => value.trim()).filter(Boolean))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DynamicInstanceForm({
  blockType,
  data,
  onSave,
  onCancel,
  saving,
}: {
  blockType: BlockType;
  data?: DynamicBlockInstance;
  onSave: (payload: { entity_id?: number; data: Record<string, unknown> }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const schemaFields = useMemo(() => parseSchemaFields(blockType.schema_definition), [blockType.schema_definition]);
  const [formData, setFormData] = useState<Record<string, unknown>>(() => data?.data || {});

  useEffect(() => {
    setFormData(data?.data || {});
  }, [data?.entity_id]);

  const updateFieldValue = (field: SchemaField, value: string) => {
    if (field.type === "number") {
      setFormData((current) => ({ ...current, [field.name]: value === "" ? "" : Number(value) }));
      return;
    }

    if (field.type === "boolean") {
      setFormData((current) => ({ ...current, [field.name]: value === "true" }));
      return;
    }

    setFormData((current) => ({ ...current, [field.name]: value }));
  };

  const handleSave = () => {
    onSave({ entity_id: data?.entity_id, data: formData });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Dynamic instance — {blockType.type_name}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {schemaFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schema fields found for this block type.</p>
        ) : (
          schemaFields.map((field) => (
            <div key={field.name}>
              <Label>{field.label} ({field.name}) {field.required ? "*" : ""}</Label>
              {field.type === "select" ? (
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={String(formData[field.name] ?? "")}
                  onChange={(e) => updateFieldValue(field, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === "boolean" ? (
                <select
                  className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  value={String(formData[field.name] ?? "false")}
                  onChange={(e) => updateFieldValue(field, e.target.value)}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={String(formData[field.name] ?? "")}
                  onChange={(e) => updateFieldValue(field, e.target.value)}
                />
              )}
            </div>
          ))
        )}
        <div className="flex gap-2">
          <Button onClick={handleSave} className="gradient-brand text-primary-foreground" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TagsForm({ chatbotId, token, onCancel }: { chatbotId: number; token: string; onCancel: () => void }) {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<ChatbotItemSummary[]>([]);
  const [tagCode, setTagCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [synonymsInput, setSynonymsInput] = useState("");
  const [itemIdInput, setItemIdInput] = useState("");
  const [itemTagCodes, setItemTagCodes] = useState("");

  const refresh = async () => {
    const [tagRows, itemRows] = await Promise.all([
      adminApi.listTags(token),
      adminApi.listChatbotItems(chatbotId, token)
    ]);
    setTags(tagRows);
    setItems(itemRows);
  };

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const resolveItemId = (rawValue: string): number => {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("Please enter a valid positive numeric ID.");
    }

    const asItem = items.find((entry) => entry.item_id === parsed);
    if (asItem) {
      return asItem.item_id;
    }

    const asEntity = items.find((entry) => entry.entity_id === parsed);
    if (asEntity) {
      toast({
        title: "Entity ID detected",
        description: `Entity #${parsed} maps to item #${asEntity.item_id}. Using item id automatically.`
      });
      return asEntity.item_id;
    }

    throw new Error("ID not found for this chatbot. Use item_id from the list below.");
  };

  const createTag = async () => {
    try {
      const synonyms = synonymsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      await adminApi.createTag(
        {
          tag_code: tagCode,
          description,
          category,
          ...(synonyms.length > 0 ? { synonyms } : {})
        },
        token
      );
      toast({ title: "Tag created" });
      setTagCode("");
      setDescription("");
      setCategory("");
      setSynonymsInput("");
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to create tag";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const loadItemTags = async () => {
    try {
      const resolvedItemId = resolveItemId(itemIdInput);
      const rows = await adminApi.getItemTags(chatbotId, resolvedItemId, token);
      setItemIdInput(String(resolvedItemId));
      setItemTagCodes(rows.map((row) => row.tag_code).join(", "));
      if (rows.length === 0) {
        toast({ title: "No tags", description: `Item #${resolvedItemId} has no tags yet.` });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to load item tags";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const saveItemTags = async () => {
    try {
      const resolvedItemId = resolveItemId(itemIdInput);
      const codes = itemTagCodes
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      if (codes.length === 0) {
        throw new Error("Enter at least one tag code before saving.");
      }

      await adminApi.updateItemTags(chatbotId, resolvedItemId, { tagCodes: codes }, token);
      setItemIdInput(String(resolvedItemId));
      toast({ title: "Item tags updated", description: `Saved ${codes.length} tag(s) on item #${resolvedItemId}.` });
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save item tags";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tags & Item tags</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Create tag</Label>
          <Input placeholder="tag_code (e.g. STORE_NAME)" value={tagCode} onChange={(e) => setTagCode(e.target.value)} />
          <Input placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Textarea
            rows={2}
            placeholder="synonyms separated by commas (e.g. store name, shop name, business name)"
            value={synonymsInput}
            onChange={(e) => setSynonymsInput(e.target.value)}
          />
          <Button size="sm" onClick={createTag}>Create tag</Button>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Existing tags</p>
          <div className="max-h-28 overflow-auto text-xs border rounded-md p-2 space-y-1">
            {tags.map((tag) => (
              <div key={tag.id}>
                <span className="font-medium">{tag.tag_code}</span> ({tag.category || "no-category"})
                {tag.synonyms.length > 0 ? <span className="text-muted-foreground"> — {tag.synonyms.join(", ")}</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Chatbot items map (use item_id for tagging)</p>
          <div className="max-h-28 overflow-auto text-xs border rounded-md p-2 space-y-1">
            {items.map((item) => (
              <div key={item.item_id}>
                item #{item.item_id} → entity #{item.entity_id} ({item.entity_type}
                {item.type_name ? ` / ${item.type_name}` : ""})
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Item tags by item ID</Label>
          <Input
            placeholder="item id (or entity id; auto-resolved if unique)"
            value={itemIdInput}
            onChange={(e) => setItemIdInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadItemTags}>Load item tags</Button>
          </div>
          <Textarea rows={3} placeholder="tag_code_1, tag_code_2" value={itemTagCodes} onChange={(e) => setItemTagCodes(e.target.value)} />
          <Button size="sm" onClick={saveItemTags}>Save item tags</Button>
        </div>

        <Button variant="outline" onClick={onCancel}>Close</Button>
      </CardContent>
    </Card>
  );
}

export default ChatbotBuilder;
