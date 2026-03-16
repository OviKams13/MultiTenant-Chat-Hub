import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { BlockType, ChatbotItemSummary, DynamicBlockInstance, ScheduleBlock, Tag as TagRecord, adminApi } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, ContactRound, Plus, Puzzle, Tag as TagIcon, Trash2 } from "lucide-react";

type BuilderToolType = "CONTACT" | "SCHEDULE" | "CUSTOM_BLOCK" | "TAGS" | `TYPE:${number}`;

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


interface ToolColorStyle {
  container: string;
  iconWrap: string;
}

const TOOL_COLORS: Record<"CONTACT" | "SCHEDULE" | "CUSTOM_BLOCK" | "TAGS", ToolColorStyle> = {
  CONTACT: {
    container: "border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/60",
    iconWrap: "bg-rose-100 text-rose-700",
  },
  SCHEDULE: {
    container: "border-sky-200/80 bg-sky-50/60 hover:bg-sky-100/60",
    iconWrap: "bg-sky-100 text-sky-700",
  },
  CUSTOM_BLOCK: {
    container: "border-violet-200/80 bg-violet-50/60 hover:bg-violet-100/60",
    iconWrap: "bg-violet-100 text-violet-700",
  },
  TAGS: {
    container: "border-amber-200/80 bg-amber-50/70 hover:bg-amber-100/70",
    iconWrap: "bg-amber-100 text-amber-700",
  },
};

const DYNAMIC_TOOL_COLORS: ToolColorStyle[] = [
  { container: "border-fuchsia-200/80 bg-fuchsia-50/60 hover:bg-fuchsia-100/60", iconWrap: "bg-fuchsia-100 text-fuchsia-700" },
  { container: "border-cyan-200/80 bg-cyan-50/60 hover:bg-cyan-100/60", iconWrap: "bg-cyan-100 text-cyan-700" },
  { container: "border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/60", iconWrap: "bg-emerald-100 text-emerald-700" },
  { container: "border-indigo-200/80 bg-indigo-50/60 hover:bg-indigo-100/60", iconWrap: "bg-indigo-100 text-indigo-700" },
  { container: "border-orange-200/80 bg-orange-50/60 hover:bg-orange-100/60", iconWrap: "bg-orange-100 text-orange-700" },
  { container: "border-teal-200/80 bg-teal-50/60 hover:bg-teal-100/60", iconWrap: "bg-teal-100 text-teal-700" },
];

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


  const openFromDrop = (value: BuilderToolType) => {
    if (value === "CONTACT") {
      setMode({ type: "CONTACT" });
      return;
    }

    if (value === "SCHEDULE") {
      setMode({ type: "SCHEDULE", data: schedules[0] });
      return;
    }

    if (value === "TAGS") {
      setMode({ type: "TAGS" });
      return;
    }

    if (value === "CUSTOM_BLOCK") {
      setMode({ type: "BLOCK_TYPE" });
      toast({ title: "Create custom block", description: "Define your block type before adding block data." });
      return;
    }

    const [, rawTypeId] = value.split(":");
    const typeId = Number(rawTypeId);
    const blockType = blockTypes.find((type) => type.type_id === typeId);
    if (!blockType) return;

    const existingInstance = (instancesByType[typeId] ?? [])[0];
    setMode({ type: "INSTANCE", blockType, data: existingInstance });
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("builder-tool-type") as BuilderToolType;
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

  const editType = async (typeId: number) => {
    if (!token) return;
    const full = await adminApi.getBlockType(chatbotId, typeId, token);
    setMode({ type: "BLOCK_TYPE", data: full });
  };

  const tools = [
    { type: "CONTACT" as const, label: "Contact Block", icon: ContactRound },
    { type: "SCHEDULE" as const, label: "Schedule Block", icon: CalendarClock },
    { type: "CUSTOM_BLOCK" as const, label: "Custom Block", icon: Puzzle },
  ];

  const dynamicToolColorMap = useMemo(() => {
    const usedIndexes = new Set<number>();
    const assignments: Record<number, ToolColorStyle> = {};

    const sortedTypes = [...blockTypes].sort((a, b) => a.type_id - b.type_id);

    sortedTypes.forEach((type) => {
      const preferred = Math.abs(type.type_id) % DYNAMIC_TOOL_COLORS.length;
      let selected = preferred;

      if (usedIndexes.has(selected)) {
        const available = DYNAMIC_TOOL_COLORS.findIndex((_, index) => !usedIndexes.has(index));
        if (available >= 0) {
          selected = available;
        }
      }

      usedIndexes.add(selected);
      assignments[type.type_id] = DYNAMIC_TOOL_COLORS[selected];
    });

    return assignments;
  }, [blockTypes]);

  return (
    <AdminLayout mainClassName="max-w-none w-full px-2 py-2 min-h-[calc(100vh-4rem)]">
      <div className="flex h-[calc(100vh-4.5rem)] flex-col gap-2 lg:flex-row">
        <Card className="lg:w-72 shrink-0 h-full">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
              <span>Builder tools</span>
              <span className="text-xs font-normal text-muted-foreground truncate">{shopName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const color = TOOL_COLORS[tool.type];
              return (
                <button
                  key={tool.type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("builder-tool-type", tool.type)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors cursor-grab ${color.container}`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${color.iconWrap}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {tool.label}
                  </div>
                </button>
              );
            })}

            {blockTypes.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="text-xs font-medium text-muted-foreground px-1">Custom type blocks</p>
                {blockTypes.map((type) => {
                  const color = dynamicToolColorMap[type.type_id] ?? DYNAMIC_TOOL_COLORS[0];
                  return (
                    <button
                      key={type.type_id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("builder-tool-type", `TYPE:${type.type_id}`)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors cursor-grab ${color.container}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${color.iconWrap}`}>
                          <Puzzle className="h-4 w-4" />
                        </span>
                        {type.type_name}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            <Separator className="my-3" />
            <button
              draggable
              onDragStart={(e) => e.dataTransfer.setData("builder-tool-type", "TAGS")}
              className={`w-full rounded-lg border p-3 text-left transition-colors cursor-grab ${TOOL_COLORS.TAGS.container}`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${TOOL_COLORS.TAGS.iconWrap}`}>
                  <TagIcon className="h-4 w-4" />
                </span>
                Manage Tag
              </div>
            </button>
          </CardContent>
        </Card>

        <div
          className="flex-1 h-full overflow-hidden rounded-xl border border-dashed bg-white p-4 lg:p-5"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.25) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >

          {mode.type !== "NONE" && (
            <div className="mx-auto mt-3 mb-4 h-[calc(100%-1.75rem)] w-full max-w-3xl overflow-y-auto pr-1">
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
                  onEditDefinition={() => editType(mode.blockType.type_id)}
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
  onEditDefinition,
  onCancel,
  saving,
}: {
  blockType: BlockType;
  data?: DynamicBlockInstance;
  onSave: (payload: { entity_id?: number; data: Record<string, unknown> }) => void;
  onEditDefinition: () => void;
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
          <Button variant="outline" onClick={onEditDefinition}>Edit Block Type Definition</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TagsForm({ chatbotId, token, onCancel }: { chatbotId: number; token: string; onCancel: () => void }) {
  const { toast } = useToast();
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [items, setItems] = useState<ChatbotItemSummary[]>([]);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagCode, setTagCode] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [synonymsInput, setSynonymsInput] = useState("");
  const [itemIdInput, setItemIdInput] = useState("");
  const [itemTagCodes, setItemTagCodes] = useState("");

  const resetTagForm = () => {
    setEditingTagId(null);
    setTagCode("");
    setDescription("");
    setCategory("");
    setSynonymsInput("");
  };

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

    throw new Error("ID not found for this chatbot. Use a valid item_id or entity_id.");
  };

  const startEditTag = (tag: TagRecord) => {
    setEditingTagId(tag.id);
    setTagCode(tag.tag_code);
    setDescription(tag.description ?? "");
    setCategory(tag.category ?? "");
    setSynonymsInput(tag.synonyms.join(", "));
  };

  const upsertTag = async () => {
    try {
      const synonyms = synonymsInput
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const payload = {
        tag_code: tagCode,
        description,
        category,
        ...(synonyms.length > 0 ? { synonyms } : {})
      };

      if (editingTagId) {
        await adminApi.updateTag(editingTagId, payload, token);
        toast({ title: "Tag updated" });
      } else {
        await adminApi.createTag(payload, token);
        toast({ title: "Tag created" });
      }

      resetTagForm();
      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save tag";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };



  const deleteTag = async (tag: TagRecord) => {
    const confirmed = window.confirm(`Are you sure you want to delete tag "${tag.tag_code}"?`);
    if (!confirmed) return;

    try {
      await adminApi.deleteTag(tag.id, token);
      toast({ title: "Tag deleted" });

      if (editingTagId === tag.id) {
        resetTagForm();
      }

      await refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to delete tag";
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
          <Label>{editingTagId ? "Edit tag" : "Create tag"}</Label>
          <Input placeholder="tag_code (e.g. STORE_NAME)" value={tagCode} onChange={(e) => setTagCode(e.target.value)} />
          <Input placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Textarea
            rows={2}
            placeholder="synonyms separated by commas (e.g. store name, shop name, business name)"
            value={synonymsInput}
            onChange={(e) => setSynonymsInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={upsertTag}>{editingTagId ? "Edit tag" : "Create tag"}</Button>
            {editingTagId ? <Button size="sm" variant="outline" onClick={resetTagForm}>Cancel edit</Button> : null}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Existing tags</p>
          <div className="max-h-56 overflow-auto text-xs border rounded-md p-2 space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-start justify-between gap-3 border rounded-sm p-2">
                <div className="flex items-start gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEditTag(tag)}>
                    Edit
                  </Button>
                  <div>
                    <div>
                      <span className="font-medium">{tag.tag_code}</span> ({tag.category || "no-category"})
                    </div>
                    {tag.synonyms.length > 0 ? <div className="text-muted-foreground">{tag.synonyms.join(", ")}</div> : null}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteTag(tag)} aria-label={`Delete tag ${tag.tag_code}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
