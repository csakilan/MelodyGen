import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const result = await fetch("http://127.0.0.1:8080").then(res => res.json());
    return NextResponse.json(result);
}