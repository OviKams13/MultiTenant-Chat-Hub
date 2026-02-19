import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Pencil, Wrench, ExternalLink } from "lucide-react";

interface Chatbot {
  id: string;
  display_name: string;
  domain: string;
  description: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [shops, setShops] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("chatbots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setShops((data as Chatbot[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Shops</h1>
          <p className="text-muted-foreground mt-1">Manage your chatbot-powered stores</p>
        </div>
        <Button asChild className="gradient-brand text-primary-foreground gap-2">
          <Link to="/admin/chatbots/new"><Plus className="h-4 w-4" /> Create new shop</Link>
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
      ) : shops.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No shops yet</h3>
            <p className="text-muted-foreground mb-4">Create your first shop to get started</p>
            <Button asChild className="gradient-brand text-primary-foreground">
              <Link to="/admin/chatbots/new">Create shop</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shops.map(shop => (
            <Card key={shop.id} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{shop.display_name}</CardTitle>
                <CardDescription className="font-mono text-xs">{shop.domain}</CardDescription>
                {shop.description && <p className="text-sm text-muted-foreground mt-1">{shop.description}</p>}
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" asChild className="gap-1">
                  <Link to={`/admin/chatbots/${shop.id}/edit`}><Pencil className="h-3 w-3" /> Edit</Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1">
                  <Link to={`/admin/chatbots/${shop.id}/builder`}><Wrench className="h-3 w-3" /> Builder</Link>
                </Button>
                <Button size="sm" variant="ghost" asChild className="gap-1">
                  <Link to={`/mall/shops/${shop.domain}`}><ExternalLink className="h-3 w-3" /> Preview</Link>
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
