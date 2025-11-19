import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    await dbConnect();

    const { cityId } = await params;

    // Convert cityId to city name
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Get school district information
    const schoolDistricts = await Listing.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${cityName}$`, "i") },
          schoolDistrict: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$schoolDistrict",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $project: {
          name: "$_id",
          propertiesServed: "$count",
        },
      },
    ]);

    // Get elementary schools
    const elementarySchools = await Listing.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${cityName}$`, "i") },
          elementarySchool: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$elementarySchool",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: "$_id",
          propertiesServed: "$count",
        },
      },
    ]);

    // Get middle schools
    const middleSchools = await Listing.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${cityName}$`, "i") },
          middleSchool: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$middleSchool",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: "$_id",
          propertiesServed: "$count",
        },
      },
    ]);

    // Get high schools
    const highSchools = await Listing.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${cityName}$`, "i") },
          highSchool: { $exists: true, $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$highSchool",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          name: "$_id",
          propertiesServed: "$count",
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      city: cityName,
      schoolDistricts,
      schools: {
        elementary: elementarySchools,
        middle: middleSchools,
        high: highSchools,
      },
    });
  } catch (error) {
    console.error("Error fetching school data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch school data" },
      { status: 500 }
    );
  }
}
