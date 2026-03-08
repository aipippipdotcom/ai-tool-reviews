const HeroSection = () => {
  return (
    <section className="bg-gradient-hero rounded-2xl p-8 md:p-14 mb-14">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground leading-tight mb-4">
          Review công cụ AI
          <br />
          <span className="bg-gradient-accent bg-clip-text text-transparent">
            & sản phẩm số
          </span>
        </h1>
        <p className="text-primary-foreground/70 text-lg md:text-xl leading-relaxed max-w-2xl">
          Đánh giá chuyên sâu, so sánh chi tiết giúp bạn chọn đúng công cụ AI phù hợp nhu cầu.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
