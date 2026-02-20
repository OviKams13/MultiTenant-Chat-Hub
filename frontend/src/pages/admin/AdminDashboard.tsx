import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { adminApi, Chatbot } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Pencil, Wrench, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!token) return;
    const data = await adminApi.listChatbots(token);
    setChatbots(data);
  };

  useEffect(() => {
    if (!token) return;
    refresh()
      .catch((error: Error) => {
        toast({ title: "Failed to load chatbots", description: error.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await adminApi.deleteChatbot(id, token);
      toast({ title: "Chatbot deleted" });
      await refresh();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Chatbots</h1>
          <p className="text-muted-foreground mt-1">Manage your admin chatbots and builder configuration</p>
        </div>
        <Button asChild className="gradient-brand text-primary-foreground gap-2">
          <Link to="/admin/chatbots/new"><Plus className="h-4 w-4" /> Create new chatbot</Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 bg-muted rounded w-2/3" /><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardHeader>
            </Card>
          ))}
        </div>
      ) : chatbots.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No chatbots yet</h3>
            <p className="text-muted-foreground mb-4">Create your first chatbot to get started</p>
            <Button asChild className="gradient-brand text-primary-foreground">
              <Link to="/admin/chatbots/new">Create chatbot</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chatbots.map(chatbot => (
            <Card key={chatbot.id} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{chatbot.display_name}</CardTitle>
                <CardDescription className="font-mono text-xs">{chatbot.domain}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" asChild className="gap-1">
                  <Link to={`/admin/chatbots/${chatbot.id}/edit`}><Pencil className="h-3 w-3" /> Edit</Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1">
                  <Link to={`/admin/chatbots/${chatbot.id}/builder`}><Wrench className="h-3 w-3" /> Builder</Link>
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleDelete(chatbot.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" /> Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
