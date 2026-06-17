import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/montserrat/300.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl italic text-onyx">404</h1>
        <h2 className="mt-4 font-serif text-xl text-onyx">Page not found</h2>
        <p className="mt-2 text-sm text-onyx/60">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl italic text-onyx">Something went wrong</h1>
        <p className="mt-2 text-sm text-onyx/60">Please try refreshing or return home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="px-6 py-3 bg-onyx text-ivory text-[11px] uppercase tracking-[0.3em] hover:bg-gold transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-onyx text-[11px] uppercase tracking-[0.3em] text-onyx hover:bg-onyx hover:text-ivory transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Jelfie Jewellers — Handcrafted Fine Jewellery" },
      {
        name: "description",
        content:
          "Jelfie Jewellers — handcrafted fine jewellery shipped worldwide. Browse rings, necklaces, earrings, and bespoke pieces. Request a quote on WhatsApp.",
      },
      { name: "author", content: "Jelfie Jewellers" },
      { property: "og:title", content: "Jelfie Jewellers — Handcrafted Fine Jewellery" },
      { property: "og:description", content: "Jelfie Jewellers is an international e-commerce platform for showcasing and selling jewelry." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Jelfie Jewellers — Handcrafted Fine Jewellery" },
      { name: "description", content: "Jelfie Jewellers is an international e-commerce platform for showcasing and selling jewelry." },
      { name: "twitter:description", content: "Jelfie Jewellers is an international e-commerce platform for showcasing and selling jewelry." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/06ea6268-7d83-4c4b-a512-bb962fc598d8/id-preview-91a79385--bc12eae4-4c0f-4742-b220-c0fd9f5f70f4.lovable.app-1781704485444.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/06ea6268-7d83-4c4b-a512-bb962fc598d8/id-preview-91a79385--bc12eae4-4c0f-4742-b220-c0fd9f5f70f4.lovable.app-1781704485444.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
