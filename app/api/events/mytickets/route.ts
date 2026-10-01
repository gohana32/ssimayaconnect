import { eventTimeZone } from '@/lib/events/dates';
import { hasSlotEnded } from '@/lib/events/status';
import { isValidPhone, normalizePhone, phoneIdentity } from '@/lib/phone';
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  connectDB,
} from '@/lib/db';

import {
  Booking,
} from '@/models/Booking';

import '@/models/Event';
import '@/models/Slot';
import '@/models/DaySchedule';

export const dynamic =
  'force-dynamic';

export const revalidate =
  0;


/* ============================================================
   TYPES
============================================================ */

type TicketStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'ATTENDED';



/* ============================================================
   GET MY TICKETS
============================================================ */

export async function GET(
  request: NextRequest,
) {

  try {

    await connectDB();



    const {
      searchParams,
    } =
      new URL(
        request.url,
      );



    const mobile =
      searchParams
        .get('mobile')
        ?.trim();



    if (!mobile) {

      return NextResponse.json(
        {
          success:
            false,

          message:
            'Mobile number is required.',
        },
        {
          status:
            400,
        },
      );

    }



    const normalizedMobile =
      normalizePhone(
        mobile,
      );

    const email =
      searchParams.get('email')?.trim().toLowerCase() || '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Enter the email address used for booking.' },
        { status: 400 },
      );
    }

    if (!isValidPhone(mobile)) {
      return NextResponse.json(
        { success: false, message: 'Enter your full mobile number.' },
        { status: 400 },
      );
    }

    // Normalize the complete stored number, including its separate calling code.
    // Existing records remain readable without a destructive data migration.
    const bookings = await Booking.find({ 'details.email': email })
      .populate(
        {
          path:
            'eventId',

          select:
            'eventName venue imageUrl updatedAt startDate endDate status timeZone',
        },
      )
      .populate(
        {
          path:
            'slotId',

          select:
            'startTime endTime',
        },
      )
      .populate(
        {
          path:
            'dayScheduleId',

          select:
            'date',
        },
      )
      .sort(
        {
          createdAt:
            -1,
        },
      )
      .lean();



    const tickets =
      bookings.filter((booking) => phoneIdentity(booking.details?.mobile || booking.details?.phone, booking.details?.countryCode) === normalizedMobile).map(
        (
          booking,
        ) => {


          const event =
            getObject(
              booking.eventId,
            );


          const slot =
            getObject(
              booking.slotId,
            );


          const schedule =
            getObject(
              booking.dayScheduleId,
            );



          const status =
            calculateTicketStatus(
              booking,
              slot,
              schedule,
              eventTimeZone(event.timeZone),
            );



          return {

            timeZone: eventTimeZone(event.timeZone),
            bookingId:
              booking.bookingId,


            eventId:
              String(
                event._id ||
                booking.eventId ||
                '',
              ),


            eventName:
              String(
                event.eventName ||
                'Event',
              ),


            venue:
              String(
                event.venue ||
                '',
              ),


            imageUrl:
              event.imageUrl
                ? `/api/events/${String(
                    event._id ||
                    booking.eventId ||
                    '',
                  )}/image?v=${new Date(
                    event.updatedAt ||
                    Date.now(),
                  ).getTime()}`
                : '',


            date:
              (schedule.date || event.startDate ? new Date(schedule.date || event.startDate).toISOString() : ''),


            startTime:
              String(
                slot.startTime ||
                '',
              ),


            endTime:
              String(
                slot.endTime ||
                '',
              ),


            status,


            attendanceStatus:
              booking.attendanceStatus ||
              'NOT_PRESENT',


            checkedInAt:
              booking.checkedInAt ||
              null,


            checkedInBy:
              booking.checkedInBy ||
              '',


            checkInMethod:
              booking.checkInMethod ||
              '',



            qrData:
              JSON.stringify(
                {
                  type:
                    'SSI_MAYA_CONNECT_ATTENDANCE',

                  doctorId:
                    String(
                      booking._id ||
                      '',
                    ),

                  bookingId:
                    booking.bookingId,

                  eventId:
                    String(
                      event._id ||
                      booking.eventId ||
                      '',
                    ),
                },
              ),


          };

        },
      );



    return NextResponse.json(
      {
        success:
          true,

        tickets,
      },
      {
        status:
          200,
      },
    );


  } catch (
    error
  ) {


    console.error(
      'My tickets API error:',
      error,
    );



    return NextResponse.json(
      {
        success:
          false,

        message:
          'Unable to fetch tickets.',
      },
      {
        status:
          500,
      },
    );

  }

}



/* ============================================================
   STATUS CALCULATION
============================================================ */


function calculateTicketStatus(
  booking: { attendanceStatus?: string },
  slot: { endTime?: string },
  schedule: { date?: string | Date },
  timeZone: string,
): TicketStatus {
  if (booking.attendanceStatus === 'PRESENT') return 'ATTENDED';
  if (!schedule.date || !slot.endTime) return 'EXPIRED';
  return hasSlotEnded(schedule.date, slot.endTime, new Date(), timeZone) ? 'EXPIRED' : 'ACTIVE';
}

/* ============================================================
   OBJECT
============================================================ */


function getObject(
  value:
    unknown,
) {


  if (
    typeof value ===
    'object' &&
    value !==
    null
  ) {

    return value as Record<
      string,
      any
    >;

  }


  return {};

}