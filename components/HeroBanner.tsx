"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BannerItem {
  id: number;
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  backgroundImage: string;
  backgroundColor: string;
}

const BANNERS_DATA: BannerItem[] = [
  {
    id: 1,
    title: "Jelajah Aneka Mainan, Tanpa Batas",
    description: "Lihat koleksi tak terbatas dari Bimbi Toys yang cocok untuk segala usia. Mulai dari mainan, alat tulis, semua ada!",
    buttonText: "Jelajahi",
    buttonHref: "/#katalog",
    backgroundImage: "/brand/hero2.png",
    backgroundColor: "",
  },
  {
    id: 2,
    title: "Temukan Produk Langsung di Toko",
    description: "Langsung lihat barang-barang yang ada di toko melalui website, dan tanyakan langsung via Whatsapp!",
    buttonText: "Lihat dong!",
    buttonHref: "/#buat-kamu-yang-gasempet",
    backgroundImage: "/brand/hero3.png",
    backgroundColor: "",
  },
];

export default function HeroBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BANNERS_DATA.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isHovered, activeIndex]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIndex((prev) => (prev - 1 + BANNERS_DATA.length) % BANNERS_DATA.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIndex((prev) => (prev + 1) % BANNERS_DATA.length);
  };

  return (
    <div
      className="relative overflow-hidden w-full group aspect-video lg:aspect-[7780/2978] lg:min-h-0 lg:aspect-[7780/2978]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {BANNERS_DATA.map((banner) => (
          <div
            key={banner.id}
            className={`w-full shrink-0 relative overflow-hidden ${banner.backgroundColor} h-full bg-cover bg-center flex items-center`}
            style={{ backgroundImage: `url(${banner.backgroundImage})` }}
          >
            <div className="relative w-full mx-auto max-w-7xl px-4 sm:px-6 py-8 md:py-16">
              <div className="space-y-3 md:space-y-4 max-w-xs sm:max-w-sm md:max-w-md text-left ml-0 sm:ml-2 md:ml-4 lg:ml-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white leading-tight font-extrabold tracking-tight">
                  {banner.title}
                </h1>
                <p className="text-slate-100 text-[11px] sm:text-xs md:text-sm leading-relaxed">
                  {banner.description}
                </p>
                <div className="pt-2">
                  <Link
                    href={banner.buttonHref}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white hover:bg-slate-100 text-bimbi-ink px-4 py-2 font-extrabold text-[10px] sm:text-xs transition-colors shadow-sm"
                  >
                    <span>{banner.buttonText}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                      className="w-3 h-3"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 glass hover:bg-white/90 text-bimbi-ink hover:text-bimbi-pink-dark w-10 h-10 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm cursor-pointer select-none"
        aria-label="Slide sebelumnya"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 glass hover:bg-white/90 text-bimbi-ink hover:text-bimbi-pink-dark w-10 h-10 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm cursor-pointer select-none"
        aria-label="Slide berikutnya"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {BANNERS_DATA.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${activeIndex === index ? "bg-white w-6" : "bg-white/50 hover:bg-white/80 w-2"
              }`}
            aria-label={`Ke slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
