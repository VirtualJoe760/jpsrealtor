import React from "react";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

interface OhCaptureHeroProps {
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: number;
  images: string[];
  qrLink: string;
}

const OhCaptureHero: React.FC<OhCaptureHeroProps> = ({
  address,
  beds,
  baths,
  sqft,
  lotSize,
  images,
  qrLink,
}) => {
  return (
    <div className="relative w-full h-[600px] bg-black text-white overflow-hidden">
      {/* Background Image Carousel */}
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        loop={true}
        autoplay={{ delay: 5000 }}
        className="absolute top-0 left-0 w-full h-full z-0"
      >
        {images.map((img, index) => (
          <SwiperSlide key={index}>
            <Image
              src={img}
              alt={`Property Image ${index + 1}`}
              layout="fill"
              objectFit="cover"
              priority
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-between p-6 md:p-10">
        {/* QR Code and Registration Text */}
        <div className="self-end text-right">
          <h2 className="text-2xl md:text-3xl font-semibold mb-2">
            Open House Registration
          </h2>
          <QRCodeCanvas value={qrLink} size={120} className="bg-white p-2 rounded-md" />
          <h2 className="text-lg md:text-xl font-medium mt-2">
            Scan the QR code or scroll down to register
          </h2>
        </div>

        {/* Property Details and Agent Image */}
        <div className="relative bg-black bg-opacity-80 p-4 rounded-lg text-center flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left">
            <h3 className="text-lg md:text-2xl font-bold">{address}</h3>
            <p className="text-sm md:text-lg">
              {beds} Bed | {baths} Bath | {sqft.toLocaleString()} sqft | Lot: {lotSize.toLocaleString()} sqft
            </p>
          </div>
          <div className="w-20 h-20 md:w-28 md:h-28 overflow-hidden rounded-full mt-4 md:mt-0">
            <Image
              src="/misc/agent/joey-transparent.png"
              alt="Agent Photo"
              width={112}
              height={112}
              objectFit="contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OhCaptureHero;