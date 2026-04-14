import { Link } from "react-router-dom";

type Props = {
  isLoggedIn: boolean;
};

export default function HowItWorks({ isLoggedIn }: Props) {
  return (
    <section className="bg-surface-container rounded-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-lg">
          school
        </span>
        <h3 className="text-sm font-bold text-on-surface">
          How Insider Trading Tracking Works
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Step
          num={1}
          icon="description"
          title="Insiders File with the SEC"
          desc="When company executives, directors, or major shareholders buy or sell stock, they must report it to the SEC within 2 business days using a Form 4 filing."
        />
        <Step
          num={2}
          icon="bolt"
          title="We Track the Filings"
          desc="We automatically pull the latest Form 4 filings from SEC EDGAR and break them down into easy-to-read insights about who's buying and selling."
        />
        <Step
          num={3}
          icon="visibility"
          title="You Spot the Signals"
          desc="Heavy insider buying can signal confidence in a company's future. Track the companies you care about and get a clear picture of insider sentiment."
        />
      </div>

      {!isLoggedIn && (
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent rounded-sm px-5 py-3 mt-2">
          <p className="text-xs text-on-surface-variant">
            Create a free account to build a personalized watchlist.
          </p>
          <Link
            to="/register"
            className="metallic-gradient text-on-primary-fixed font-bold px-4 py-1.5 rounded-sm text-xs whitespace-nowrap"
          >
            Get Started
          </Link>
        </div>
      )}
    </section>
  );
}

function Step({
  num,
  icon,
  title,
  desc,
}: {
  num: number;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
          {num}
        </span>
        <span className="material-symbols-outlined text-primary text-base">
          {icon}
        </span>
      </div>
      <h4 className="text-sm font-bold text-on-surface">{title}</h4>
      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}
