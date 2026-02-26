import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MallLayout from "@/layouts/MallLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import { useAuth } from "@/contexts/AuthContext";
import { UserChatbotDetail, userApi } from "@/lib/user-api";
import { useToast } from "@/hooks/use-toast";

// ShopDetail loads one chatbot context for end users and shows static/dynamic data before runtime chat starts.
// The page now consumes both chatbot id and domain from URL so chat integration can target the right tenant.
// We keep existing data tabs untouched while wiring the floating widget to the resolved tenant domain.
// Domain is normalized from URL first, then fallback to backend detail payload for robust routing behavior.
const ShopDetail = () => {
  const { id, domain } = useParams<{ id?: string; domain?: string }>();
  const chatbotId = Number(id);
  const { token } = useAuth();
  const { toast } = useToast();
  const [chatbot, setChatbot] = useState<UserChatbotDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // resolvedDomain ensures the widget can call public chat by domain even when URL segment is encoded.
  const resolvedDomain = useMemo(() => {
    if (domain) {
      return decodeURIComponent(domain).trim().toLowerCase();
    }

    return chatbot?.domain?.trim().toLowerCase() ?? "";
  }, [domain, chatbot?.domain]);

  // loadChatbotDetail hydrates all UI tabs and keeps the domain available for runtime widget integration.
  useEffect(() => {
    if (!id || Number.isNaN(chatbotId) || !token) return;
    userApi
      .getChatbotDetail(chatbotId, token)
      .then(setChatbot)
      .catch((error: Error) => {
        toast({ title: "Failed to load chatbot", description: error.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [id, chatbotId, token, toast]);

  if (loading) return <MallLayout><div className="py-16 text-center text-muted-foreground">Loading…</div></MallLayout>;
  if (!chatbot) return <MallLayout><div className="py-16 text-center text-muted-foreground">Chatbot not found</div></MallLayout>;

  return (
    <MallLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2 gap-1">
          <Link to="/mall"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold">{chatbot.display_name}</h1>
        <p className="text-sm text-muted-foreground">Domain: {chatbot.domain}</p>
      </div>

      <Tabs defaultValue="contact" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          {chatbot.custom_blocks.map((block) => (
            <TabsTrigger key={block.type_id} value={`custom-${block.type_id}`}>
              {block.type_name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="contact">
          {!chatbot.contact ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No contact info available</CardContent></Card>
          ) : (
            <Card className="shadow-card">
              <CardHeader><CardTitle>{chatbot.contact.org_name || chatbot.display_name}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {chatbot.contact.phone && <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /> {chatbot.contact.phone}</p>}
                {chatbot.contact.email && <p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" /> <a href={`mailto:${chatbot.contact.email}`} className="underline">{chatbot.contact.email}</a></p>}
                {(chatbot.contact.address_text || chatbot.contact.city || chatbot.contact.country) && (
                  <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" /> {[chatbot.contact.address_text, chatbot.contact.city, chatbot.contact.country].filter(Boolean).join(", ")}</p>
                )}
                {chatbot.contact.hours_text && <div className="rounded-md bg-secondary p-3 text-sm mt-2"><p className="font-medium mb-1">Opening Hours</p><p className="text-muted-foreground whitespace-pre-line">{chatbot.contact.hours_text}</p></div>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          {chatbot.schedules.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No schedule available</CardContent></Card>
          ) : (
            <Card className="shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chatbot.schedules.map((s, idx) => (
                    <TableRow key={`${s.day_of_week}-${idx}`}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>{s.day_of_week}</TableCell>
                      <TableCell>{s.open_time}</TableCell>
                      <TableCell>{s.close_time}</TableCell>
                      <TableCell className="text-muted-foreground">{s.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {chatbot.custom_blocks.map((block) => (
          <TabsContent key={block.type_id} value={`custom-${block.type_id}`}>
            {block.instances.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No data available for this custom block</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {block.instances.map((instance, index) => (
                  <Card key={index} className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-base">{block.type_name} #{index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-secondary rounded p-3 overflow-auto">{JSON.stringify(instance, null, 2)}</pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ChatWidget now calls /api/v1/public/chat using domain from URL context so tenant scope follows current page. */}
      <ChatWidget shopName={chatbot.display_name} domain={resolvedDomain} />
    </MallLayout>
  );
};

export default ShopDetail;
