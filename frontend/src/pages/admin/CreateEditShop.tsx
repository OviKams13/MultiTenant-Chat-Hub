import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CreateEditShop = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      supabase.from("chatbots").select("*").eq("id", id).single().then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name);
          setDomain(data.domain);
          setDescription(data.description || "");
          setCategory(data.category || "");
        }
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const slug = domain.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

    try {
      if (isEdit && id) {
        const { error } = await supabase.from("chatbots").update({ display_name: displayName, domain: slug, description, category }).eq("id", id);
        if (error) throw error;
        toast({ title: "Shop updated!" });
      } else {
        const { error } = await supabase.from("chatbots").insert({ user_id: user.id, display_name: displayName, domain: slug, description, category });
        if (error) throw error;
        toast({ title: "Shop created!" });
      }
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Card className="max-w-xl mx-auto shadow-elevated">
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Shop" : "Create New Shop"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Store name</Label>
              <Input required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Linda's Cakes" />
            </div>
            <div className="space-y-2">
              <Label>Domain / slug</Label>
              <Input required value={domain} onChange={e => setDomain(e.target.value)} placeholder="lindas-cakes" />
              <p className="text-xs text-muted-foreground">This will be used in the public URL</p>
            </div>
            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Home-made cakes and pastries" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Food, Clothes, Electronics…" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="gradient-brand text-primary-foreground" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/admin/dashboard")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default CreateEditShop;
