import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ShineBorder from "@/components/ui/shine-border";
import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function PricingSectionCards() {
  const [isLemonSqueezyLoaded, setIsLemonSqueezyLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.async = true;
    script.onload = () => {
      if (window.createLemonSqueezy) {
        window.createLemonSqueezy();
        setIsLemonSqueezyLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSignUp = (event: React.MouseEvent, url: string) => {
    event.preventDefault();
    if (isLemonSqueezyLoaded && window.LemonSqueezy) {
      window.LemonSqueezy.Setup({
        eventHandler: (event) => {
          if (event.event === "Checkout.Success") {
            console.log("User has successfully signed up!");
          }
        },
      });
      window.LemonSqueezy.Url.Open(url);
    } else {
      console.error("LemonSqueezy is not initialized");
    }
  };

  return (
    <>
      {/* Pricing */}
      <div className=" py-8">
        {/* Title */}
        <div className="max-w-2xl mx-auto text-center mb-10 lg:mb-14">
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
            Pricing
          </h2>
          <p className="mt-1 text-muted-foreground">
            No subscriptions 😮. Simply pay for what you need.
          </p>
        </div>
        {/* End Title */}
        {/* Grid */}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-2 gap-6 lg:items-center">
          {/* Card */}
          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="mb-7">Beginner Credits</CardTitle>
              <span className="font-bold text-5xl">$4.99</span>
            </CardHeader>
            <CardDescription className="text-center">
              perfect for getting started
            </CardDescription>
            <CardContent>
              <ul className="mt-7 space-y-2.5 text-sm">
                <li className="flex space-x-2">
                  <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
                  <span className="text-muted-foreground">
                    Send a total of 200gb
                  </span>
                </li>
                <li className="flex space-x-2">
                  <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
                  <span className="text-muted-foreground">
                    50gb file size limit
                  </span>
                </li>
                <li className="flex space-x-2">
                  <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
                  <span className="text-muted-foreground">Premium support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={"outline"}
                onClick={(e) =>
                  handleSignUp(
                    e,
                    "https://rapidfiletransfer.lemonsqueezy.com/buy/f083c51c-db81-48e3-91be-ae41a01916f5"
                  )
                }
              >
                Sign up
              </Button>
            </CardFooter>
          </Card>
          {/* End Card */}
          {/* Card */}
          <ShineBorder
            className="relative w-full flex-col items-center justify-center overflow-hidden rounded-lg border dark:bg-card pointer-events-none"
            color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
          >
            <Card className="border-primary border-none w-full pointer-events-auto">
              <CardHeader className="text-center pb-2">
                <Badge className="uppercase w-max self-center mb-3">
                  Most popular
                </Badge>
                <CardTitle className="!mb-7">Bulk Credits</CardTitle>
                <span className="font-bold text-5xl">$14.99</span>
              </CardHeader>
              <CardDescription className="text-center w-11/12 mx-auto">
                Good for larger projects with a lot a data to transfer
              </CardDescription>
              <CardContent>
                <ul className="mt-7 space-y-2.5 text-sm">
                  <li className="flex space-x-2">
                    <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
                    <span className="text-muted-foreground">
                      Send a total of 1 tb
                    </span>
                  </li>
                  <li className="flex space-x-2">
                    <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
                    <span className="text-muted-foreground">
                      100gb file size limit
                    </span>
                  </li>
                  <li className="flex space-x-2">
                    <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
                    <span className="text-muted-foreground">
                      Premium support
                    </span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={"outline"}
                  onClick={(e) =>
                    handleSignUp(
                      e,
                      "https://rapidfiletransfer.lemonsqueezy.com/buy/289cd5b8-a75f-4dd5-b5ec-94cb5a80d618"
                    )
                  }
                >
                  Sign up
                </Button>
              </CardFooter>
            </Card>
          </ShineBorder>
          {/* End Card */}
        </div>
        {/* End Grid */}
      </div>
      {/* End Pricing */}
    </>
  );
}
