import { NextResponse } from 'next/server';
import clientPromise from '@/utils/dbConnect';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(); // Defaults to the database name in the connection string
        const collection = db.collection('test'); // Replace 'test' with your collection name
        const data = await collection.find({}).toArray();
        return NextResponse.json({ data });
    } catch (error) {
        console.error('Database connection failed:', error);
        return NextResponse.json({ error: 'Failed to connect to database' }, { status: 500 });
    }
}

