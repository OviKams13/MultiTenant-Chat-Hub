import { useEffect, useState } from "react";
import MallLayout from "@/layouts/MallLayout";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, ArrowRight } from "lucide-react";

interface Shop {
  id: string;
  display_name: string;
  domain: string;
  description: string;
  category: string;
}

const MallHome = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("chatbots").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setShops((data as Shop[]) || []);
      setLoading(false);
    });
  }, []);

  const filtered = shops.filter(s =>
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MallLayout searchQuery={search} onSearch={setSearch}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Explore the Mall</h1>
        <p className="text-muted-foreground mt-1">Browse all shops and chat with their assistants</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse"><CardHeader><div className="h-5 bg-muted rounded w-2/3" /><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardHeader></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No shops found</h3>
          <p className="text-muted-foreground">Try a different search term</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(shop => (
            <Card key={shop.id} className="shadow-card hover:shadow-elevated transition-shadow group">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{shop.display_name}</CardTitle>
                {shop.category && <span className="inline-block text-xs bg-secondary px-2 py-0.5 rounded-full">{shop.category}</span>}
                {shop.description && <CardDescription className="mt-1">{shop.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full gap-2 group-hover:border-primary group-hover:text-primary transition-colors">
                  <Link to={`/mall/shops/${shop.domain}`}>View shop <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MallLayout>
  );
};

export default MallHome;
