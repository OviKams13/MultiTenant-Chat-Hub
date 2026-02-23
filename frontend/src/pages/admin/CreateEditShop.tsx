import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { adminApi } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CreateEditShop = () => {
  const { id } = useParams();
  const chatbotId = id ? Number(id) : null;
  const isEdit = Boolean(chatbotId);
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !chatbotId || !token) return;

    adminApi.getChatbot(chatbotId, token)
      .then((chatbot) => {
        setDisplayName(chatbot.display_name);
        setDomain(chatbot.domain);
      })
      .catch((error: Error) => {
        toast({ title: "Unable to load chatbot", description: error.message, variant: "destructive" });
      });
  }, [chatbotId, isEdit, token, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);

    try {
      if (isEdit && chatbotId) {
        await adminApi.updateChatbot(chatbotId, { display_name: displayName, domain }, token);
        toast({ title: "Chatbot updated!" });
      } else {
        await adminApi.createChatbot({ display_name: displayName, domain }, token);
        toast({ title: "Chatbot created!" });
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
          <CardTitle>{isEdit ? "Edit Chatbot" : "Create New Chatbot"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Chatbot name</Label>
              <Input required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Linda's Cakes" />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input required value={domain} onChange={e => setDomain(e.target.value)} placeholder="shop.example.com" />
              <p className="text-xs text-muted-foreground">Use a valid domain format (example: myshop.com)</p>
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
