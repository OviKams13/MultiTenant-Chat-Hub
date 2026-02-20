import { useEffect, useMemo, useState } from "react";
import MallLayout from "@/layouts/MallLayout";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, ArrowRight, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerChatbotsGroup, userApi } from "@/lib/user-api";
import { useToast } from "@/hooks/use-toast";

const MallHome = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<OwnerChatbotsGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    userApi.listOwnersWithChatbots(token)
      .then(setGroups)
      .catch((error: Error) => {
        toast({ title: "Failed to load chatbots", description: error.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [token, toast]);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          chatbots: group.chatbots.filter(
            (chatbot) =>
              chatbot.display_name.toLowerCase().includes(search.toLowerCase()) ||
              chatbot.domain.toLowerCase().includes(search.toLowerCase()) ||
              group.owner_email.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((group) => group.chatbots.length > 0),
    [groups, search]
  );

  return (
    <MallLayout searchQuery={search} onSearch={setSearch}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Dashboard</h1>
        <p className="text-muted-foreground mt-1">Browse admins and their available chatbots</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><CardHeader><div className="h-5 bg-muted rounded w-2/3" /><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardHeader></Card>
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No chatbots found</h3>
          <p className="text-muted-foreground">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((group) => (
            <Card key={group.owner_id} className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Admin: {group.owner_email}</CardTitle>
                <CardDescription>{group.chatbots.length} chatbot(s)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.chatbots.map((chatbot) => (
                    <Card key={chatbot.id} className="border">
                      <CardHeader>
                        <CardTitle className="text-base">{chatbot.display_name}</CardTitle>
                        <CardDescription className="font-mono text-xs">{chatbot.domain}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button asChild variant="outline" className="w-full gap-2">
                          <Link to={`/mall/chatbots/${chatbot.id}/${encodeURIComponent(chatbot.domain)}`}>Open chatbot <ArrowRight className="h-4 w-4" /></Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MallLayout>
  );
};

export default MallHome;
