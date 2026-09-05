import aidanPhoto from "@/assets/about_photos/aidan.jpg";
import anthonyPhoto from "@/assets/about_photos/anthony.jpg";
import haydenPhoto from "@/assets/about_photos/hadyen.jpg";
import groupPhoto from "@/assets/about_photos/oj_group.jpg";
import type { ReactNode } from "react";

interface AboutHeroProps {
  image: string;
  imageAlt: string;
  title: string;
  role: string;
  children: ReactNode;
}

function AboutHero({
  image,
  imageAlt,
  title,    
  role,
  children,
}: AboutHeroProps) {
  return (
    <section className="grid items-center gap-8 rounded-2xl border-2 p-6 shadow-sm md:grid-cols-2 md:p-10">
      <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted/40">
        <img
          src={image}
          alt={imageAlt}
          className="h-auto w-full object-contain"
        />
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-semibold">{title}</h2>
        <div className="border-border border-l-2 pl-3">
          <h3 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide"> {role} </h3>
        </div>
        <div className="text-muted-foreground space-y-3 text-lg leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function AboutUs() {
  document.title = "About Us - College Counter";

  return (
    <main className="app-container mx-auto w-full max-w-[1100px] px-4 py-8">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-2xl border-2 shadow-sm">
          <div className="flex items-center justify-center overflow-hidden bg-muted/40">
            <img
              src={groupPhoto}
              alt="CC Group Photo"
              className="h-auto w-full object-contain"
            />
          </div>
          <div className="space-y-4 p-6  md:p-10">
            <h1 className="text-4xl text-center font-bold">About College Counter </h1>
            <p className="text-muted-foreground mx-auto text-left max-w-4xl text-lg leading-relaxed">
            College Counter is the hub of collegiate Counter Strike with the goal of providing unparalleled coverage, exclusive rankings and key information on everything within the collegiate Counter Strike scene. It aims to be a resource for collegiate Counter Strike players, fans and supporters to grow the game.
            </p>

            <p className="text-muted-foreground mx-auto max-w-4xl text-lg leading-relaxed">
            College Counter was founded by Syracuse Esports CS2 athletes Aidan “aidanxi” DeGooyer, Anthony “Sensh1” Solt and Syracuse Esports content lead Hayden “Kimmer-” Kim. After months of development, collegecounter.org launched with its exclusive rankings and stories on the collegiate counter-strike scene in the Spring of 2025. Using their connections within Syracuse University and within the Esports scene, the three co-founders have developed partnerships and built the College Counter into the only centralized hub for collegiate Counter-Strike.
            </p>
            
            <p className="text-muted-foreground mx-auto max-w-4xl text-lg leading-relaxed">
            Today, College Counter continues its original mission as the only site exclusively covering collegiate Counter Strike. Our commitment to professionalism, community growth, unbiased reporting and reliable information remains as the site continues to grow with the scene.
            </p>
          </div>
        </section>

        <section className="pt-4 text-center" aria-labelledby="staff-heading">
          <h2 id="staff-heading" className="font-block text-4xl font-bold">
            College Counter Staff
          </h2>
        </section>

        <AboutHero
          image={aidanPhoto}
          imageAlt="Aidan Headshot"
          title="Aidan DeGooyer"
          role="Co-Founder & Website Developer"
        >
          <p>
            Aidan graduated Syracuse University with a B.S. in Computer Science and a B.A. in Economics in 2025. He currently works for Comcast as a Software Engineer. He played on the Counter-Strike team for all 4 years he attended Syracuse, being a member of the 2024 NACE Championship winning roster, along with Anthony.
          </p>
        </AboutHero>

        <AboutHero
          image={anthonyPhoto}
          imageAlt="Anthony Headshot"
          title="Anthony Solt"
          role="Co-Founder & Operations Manager"
        >
          <p>
            Anthony graduated Syracuse University with a Master of Science in Computer Science and Computer Science B.S. He served as a graduate student assistant for Syracuse Esports, specializing in project management, event coordination, and tournament organizing. He was also the captain of the Syracuse University CS2 team and President of the Gaming and Esports Club. He also played on the Syracuse Men's Hockey team for all four years of undergrad. 
          </p>
        </AboutHero>

        <AboutHero
          image={haydenPhoto}
          imageAlt="Hayden Headshot"
          title="Hayden Kim"
          role="Co-Founder & Editor in Chief"
        >
          <p>
            With Anthony and Aidan, Hayden co-founded College Counter. Graduating from Syracuse University with degrees in Journalism B.S. and Economics B.S., he is currently a graduate student at Syracuse University in the Master’s in Business Administration program. He has work experience in USA Today, the Federal Reserve of Philadelphia and the Dow Jones News Fund working in various journalistic and communications roles. He was also the Syracuse esports content lead overlooking photography, video production, social media and written articles for the program.
          </p>
        </AboutHero>
      </div>
    </main>
  );
}
