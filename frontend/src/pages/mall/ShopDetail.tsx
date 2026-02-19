import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MallLayout from "@/layouts/MallLayout";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";

interface Contact { org_name: string; phone: string; email: string; address_text: string; city: string; country: string; hours_text: string; }
interface Faq { id: string; question: string; answer: string; }
interface Schedule { id: string; title: string; day_of_week: string; open_time: string; close_time: string; notes: string; }

const ShopDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [shopName, setShopName] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: bot } = await supabase.from("chatbots").select("id, display_name").eq("domain", slug).single();
      if (!bot) { setLoading(false); return; }
      setShopName(bot.display_name);

      const { data: items } = await supabase.from("chatbot_items").select("entity_id").eq("chatbot_id", bot.id);
      const entityIds = items?.map(i => i.entity_id) || [];
      if (entityIds.length === 0) { setLoading(false); return; }

      const [c, f, s] = await Promise.all([
        supabase.from("bb_contacts").select("*").in("entity_id", entityIds),
        supabase.from("bb_faqs").select("*").in("entity_id", entityIds),
        supabase.from("bb_schedules").select("*").in("entity_id", entityIds),
      ]);
      setContacts((c.data as Contact[]) || []);
      setFaqs((f.data as Faq[]) || []);
      setSchedules((s.data as Schedule[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <MallLayout><div className="py-16 text-center text-muted-foreground">Loading…</div></MallLayout>;

  return (
    <MallLayout>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2 gap-1">
          <Link to="/mall"><ArrowLeft className="h-4 w-4" /> Back to all shops</Link>
        </Button>
        <h1 className="text-3xl font-bold">{shopName}</h1>
        <p className="text-sm text-muted-foreground">Mall &gt; {shopName}</p>
      </div>

      <Tabs defaultValue="contact" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          {contacts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No contact info available</CardContent></Card>
          ) : contacts.map((c, i) => (
            <Card key={i} className="shadow-card">
              <CardHeader><CardTitle>{c.org_name || shopName}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {c.phone && <p className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-primary" /> {c.phone}</p>}
                {c.email && <p className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" /> <a href={`mailto:${c.email}`} className="underline">{c.email}</a></p>}
                {(c.address_text || c.city || c.country) && (
                  <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" /> {[c.address_text, c.city, c.country].filter(Boolean).join(", ")}</p>
                )}
                {c.hours_text && <div className="rounded-md bg-secondary p-3 text-sm mt-2"><p className="font-medium mb-1">Opening Hours</p><p className="text-muted-foreground whitespace-pre-line">{c.hours_text}</p></div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="faq">
          {faqs.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No FAQs available</CardContent></Card>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {faqs.map(f => (
                <AccordionItem key={f.id} value={f.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          {schedules.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No schedule available</CardContent></Card>
          ) : (
            <Card className="shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.day_of_week}</TableCell>
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
      </Tabs>

      <ChatWidget shopName={shopName} />
    </MallLayout>
  );
};

export default ShopDetail;
