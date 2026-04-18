import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'usmaanimrsnsep2007@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD, // We secure your password in the .env file
      },
    });

    const mailOptions = {
      from: '"Studio Ten Terminal" <usmaanimrsnsep2007@gmail.com>',
      to: 'usmaanimrsnsep2007@gmail.com', // The email goes TO you
      replyTo: email, // If you hit 'reply' in your inbox, it goes to the client
      subject: `[STUDIO_TEN] New Connection from ${name}`,
      text: `SYSTEM TRANSMISSION LOG\n=======================\n\nDESIGNATION: ${name}\nPROTOCOL_LINK: ${email}\n\nPAYLOAD_DATA:\n${message}\n\n=======================\nEND OF LOG`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Transmission error:', error);
    return NextResponse.json({ error: 'Failed to transmit payload' }, { status: 500 });
  }
}