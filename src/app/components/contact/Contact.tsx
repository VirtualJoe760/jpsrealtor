"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import ContactInfo from "./ContactInfo";
import NameInput from "./NameInput";
import EmailInput from "./EmailInput";
import AddressInput from "./AddressInput";
import PhotoUpload from "./PhotoUpload";
import MessageInput from "./MessageInput";
import PhoneNumberInput from "./PhoneNumberInput";
import EmailSubscribe from "./EmailSubscribe";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";
import { getListId } from "@/utils/getListId";

export default function Contact() {
  const router = useRouter(); // Initialize the router
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    const fetchListId = async () => {
      if (process.env.JPSREALTOR_SENDFOX_API_TOKEN) {
        const id = await getListId(process.env.JPSREALTOR_SENDFOX_API_TOKEN, "jpsrealtor");
        setListId(id);
      } else {
        console.error("SendFox API token is missing");
      }
    };

    fetchListId();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = e.currentTarget;

      const getFieldValue = (name: string): string =>
        (form.elements.namedItem(name) as HTMLInputElement)?.value || "";

      const firstName = getFieldValue("first-name");
      const lastName = getFieldValue("last-name");
      const email = getFieldValue("email");
      const street = getFieldValue("street");
      const city = getFieldValue("city");
      const state = getFieldValue("state");
      const zip = getFieldValue("zip");
      const country = getFieldValue("country");
      const phoneCode = getFieldValue("countryCode");
      const phoneNumber = getFieldValue("phone");

      const phone = `${phoneCode} ${phoneNumber}`;
      const address = `${street}, ${city}, ${state} ${zip}, ${country}`.trim();
      const message = getFieldValue("message");

      const folderName = `${firstName}_${lastName}`.replace(/\s+/g, "_").toLowerCase();
      const uploadedPhotoUrls = await uploadToCloudinary(photos || [], folderName);

      if (optIn && listId) {
        const contactResponse = await fetch("https://api.sendfox.com/contacts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.JPSREALTOR_SENDFOX_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            first_name: firstName,
            last_name: lastName,
            lists: [listId],
          }),
        });

        if (!contactResponse.ok) {
          throw new Error("Failed to add contact to SendFox list");
        }
      }

      const formData = {
        firstName,
        lastName,
        email,
        phone,
        address,
        message,
        photos: uploadedPhotoUrls,
        optIn,
      };

      console.log("Form Data Sent:", formData);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Redirect to the success page
      router.push("/success");
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
        <ContactInfo />

        <form onSubmit={handleSubmit} className="px-9 pb-24 pt-20 sm:pb-32 lg:px-8">
          <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              <NameInput />
              <PhoneNumberInput />
              <EmailInput />
              <AddressInput />
              <PhotoUpload onPhotosSelected={(files) => setPhotos(files)} />
              <MessageInput />
            </div>
            <div className="mt-4">
              <EmailSubscribe
                label="I consent to communicate via email and recieve newsletter or updates."
                isChecked={optIn}
                onChange={setOptIn}
              />
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
