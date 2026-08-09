interface ProsConsProps {
  pros: string[];
  cons: string[];
}

const Column = ({ kind, items }: { kind: "pros" | "cons"; items: string[] }) => (
  <div className={`aff-col aff-col--${kind}`}>
    <p className="aff-col__head">{kind === "pros" ? "Pros" : "Cons"}</p>
    <ul className="aff-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  </div>
);

const ProsCons = ({ pros, cons }: ProsConsProps) => {
  if (!pros.length && !cons.length) return null;

  return (
    <div className="aff-proscons">
      {pros.length > 0 && <Column kind="pros" items={pros} />}
      {cons.length > 0 && <Column kind="cons" items={cons} />}
    </div>
  );
};

export default ProsCons;
