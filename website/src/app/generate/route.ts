import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    let success = true;
    const result = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: await request.text(),
    }).then(res => res.json()).catch(e => {
        console.log(e);
        success = false;
    });
    if (!success)
        return NextResponse.json(false);
    return NextResponse.json(result);
}