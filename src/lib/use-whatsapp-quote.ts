import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createQuoteRequest } from "@/lib/quotes.functions";
import {
  whatsappLink,
  productQuoteMessage,
  cartQuoteMessage,
} from "@/lib/whatsapp";

type ProductQuoteArgs = {
  productId: string;
  slug: string;
  name: string;
  priceUsd: number;
  imageUrl: string | null;
  currency: string;
  priceLabel: string;
};

type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceUsd: number;
  qty: number;
  image: string | null;
};

type CartQuoteArgs = {
  items: CartItem[];
  currency: string;
  format: (usd: number) => string;
  subtotalUsd: number;
};

async function loadCustomer(): Promise<{ fullName?: string | null; phone?: string | null } | undefined> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return undefined;
  const { data: p } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", data.user.id)
    .maybeSingle();
  return { fullName: p?.full_name, phone: p?.phone };
}

export function useWhatsappQuote() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const requireLogin = async (redirect: string) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast.message("Please sign in to request a quote");
      navigate({ to: "/account/sign-in", search: { redirect } });
      return false;
    }
    return true;
  };

  const sendProductQuote = async (args: ProductQuoteArgs, redirectPath: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await requireLogin(redirectPath))) return;
      const customer = await loadCustomer();
      const message = productQuoteMessage({
        name: args.name,
        slug: args.slug,
        priceLabel: args.priceLabel,
        customer,
      });
      const url = whatsappLink(message);
      await createQuoteRequest({
        data: {
          currency: args.currency,
          totalUsd: args.priceUsd,
          whatsappUrl: url,
          orderType: "quotation",
          items: [
            {
              productId: args.productId,
              name: args.name,
              slug: args.slug,
              priceUsd: args.priceUsd,
              quantity: 1,
              imageUrl: args.imageUrl,
            },
          ],
        },
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendCartQuote = async (args: CartQuoteArgs, redirectPath: string) => {
    if (busy) return;
    if (args.items.length === 0) return;
    setBusy(true);
    try {
      if (!(await requireLogin(redirectPath))) return;
      const customer = await loadCustomer();
      const totalLabel = `${args.format(args.subtotalUsd)} ${args.currency}`;
      const message = cartQuoteMessage({
        items: args.items.map((i) => ({
          name: i.name,
          slug: i.slug,
          qty: i.qty,
          priceLabel: `${args.format(i.priceUsd * i.qty)} ${args.currency}`,
        })),
        totalLabel,
        customer,
      });
      const url = whatsappLink(message);
      await createQuoteRequest({
        data: {
          currency: args.currency,
          totalUsd: args.subtotalUsd,
          whatsappUrl: url,
          items: args.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            slug: i.slug,
            priceUsd: i.priceUsd,
            quantity: i.qty,
            imageUrl: i.image,
          })),
        },
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { sendProductQuote, sendCartQuote, busy };
}
