"use client";

import { useState } from "react";
import ContactInfo from "./ContactInfo";
import NameInput from "./NameInput";
import EmailInput from "./EmailInput";
import AddressInput from "./AddressInput";
import PhotoUpload from "./PhotoUpload";
import MessageInput from "./MessageInput";
import PhoneNumberInput from "./PhoneNumberInput";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";

export default function Contact() {
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const form = e.currentTarget;
  
      // Helper to get field values
      const getFieldValue = (name: string): string =>
        (form.elements.namedItem(name) as HTMLInputElement)?.value || "";
  
      // Extract form values
      const firstName = getFieldValue("first-name");
      const lastName = getFieldValue("last-name");
      const email = getFieldValue("email");
      const street = getFieldValue("street");
      const city = getFieldValue("city");
      const state = getFieldValue("state");
      const zip = getFieldValue("zip");
      const country = getFieldValue("country");
      const phoneCode = getFieldValue("countryCode"); // From country code dropdown
      const phoneNumber = getFieldValue("phone");
  
      // Concatenate phone number with country code
      const phone = `${phoneCode} ${phoneNumber}`;
  
      // Combine address fields
      const address = `${street}, ${city}, ${state} ${zip}, ${country}`.trim();
  
      const message = getFieldValue("message");
  
      // Handle photo uploads
      const folderName = `${firstName}_${lastName}`.replace(/\s+/g, "_").toLowerCase();
      const uploadedPhotoUrls = await uploadToCloudinary(photos || [], folderName);
  
      // Prepare form data
      const formData = {
        firstName,
        lastName,
        email,
        phone,
        address,
        message,
        photos: uploadedPhotoUrls,
      };
  
      console.log("Form Data Sent:", formData);
  
      // Submit to API
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
  
      if (!res.ok) throw new Error("Failed to send message");
  
      alert("Message sent successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  

  return (
    <div id="contact" className="relative isolate bg-black text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Contact Information Section */}
        <ContactInfo />

        {/* Contact Form */}
        <form
          onSubmit={handleSubmit}
          className="px-6 pb-24 pt-20 sm:pb-32 lg:px-8 lg:py-48"
        >
          <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <NameInput />
              <PhoneNumberInput />
              <EmailInput />
              <AddressInput />
              <PhotoUpload onPhotosSelected={(files) => setPhotos(files)} />
              <MessageInput />
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="rounded-md bg-gray-700 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send message"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
