/**
 * Workspace: Request Consultation Website Form
 * Business Account: websiteforms@workeron.ai
 * 
 * Instructions:
 * 1. Deploy as Web App under websiteforms@workeron.ai
 * 2. Execute as: Me | Access: Anyone
 *
 * Endpoints:
 *   GET  ?action=slots&date=YYYY-MM-DD   → available 30-min slots
 *   POST ?action=book                    → create calendar event
 */

/* ─── Configuration ─── */
const CONFIG = {
  calendarId: 'primary',           // websiteforms@workeron.ai primary calendar
  timezone: 'Asia/Bangkok',        // Thailand time (UTC+7)
  workDayStart: 9,                 // 09:00
  workDayEnd: 18,                  // 18:00
  slotDurationMin: 30,
  maxBookingDaysAhead: 30,
  eventColor: CalendarApp.EventColor.CYAN,
};

/* ─── GET Handler ─── */
function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();

    if (action === 'slots') {
      const result = getAvailableSlots(e.parameter.date);
      return _jsonResponse(result);
    }

    return _jsonResponse({ error: 'Unknown action. Use ?action=slots&date=YYYY-MM-DD' }, 400);
  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    return _jsonResponse({ error: 'Server error: ' + err.message }, 500);
  }
}

/* ─── POST Handler ─── */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || '').toLowerCase();

    if (action === 'book') {
      const result = createBooking(body);
      return _jsonResponse(result);
    }

    return _jsonResponse({ error: 'Unknown action. Send { action: "book", ... }' }, 400);
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return _jsonResponse({ error: 'Invalid request: ' + err.message }, 400);
  }
}

/* ─── Get Available Slots ─── */
function getAvailableSlots(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { error: 'Provide date as YYYY-MM-DD' };
  }

  const tz = CONFIG.timezone;
  const dayStart = new Date(dateStr + 'T00:00:00');
  const now = new Date();

  // Check if date is in the past
  const todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  if (dateStr < todayStr) {
    return { date: dateStr, slots: [], message: 'Date is in the past' };
  }

  // Check max booking window
  const maxDate = new Date(now.getTime() + CONFIG.maxBookingDaysAhead * 86400000);
  const maxDateStr = Utilities.formatDate(maxDate, tz, 'yyyy-MM-dd');
  if (dateStr > maxDateStr) {
    return { date: dateStr, slots: [], message: 'Too far ahead' };
  }

  // Check if weekend
  const dayOfWeek = Utilities.formatDate(new Date(dateStr + 'T12:00:00'), tz, 'u');
  if (dayOfWeek === '6' || dayOfWeek === '7') {
    return { date: dateStr, slots: [], message: 'Weekend' };
  }

  // Get existing events for the day
  // Create dates in Bangkok timezone explicitly
  const calStart = new Date(dateStr + 'T' + _pad(CONFIG.workDayStart) + ':00:00+07:00');
  const calEnd = new Date(dateStr + 'T' + _pad(CONFIG.workDayEnd) + ':00:00+07:00');

  const calendar = CalendarApp.getCalendarById(CONFIG.calendarId) || CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(calStart, calEnd);

  // Build busy intervals
  const busy = events.map(ev => ({
    start: ev.getStartTime().getTime(),
    end: ev.getEndTime().getTime(),
  }));

  // Generate slots
  const slotMs = CONFIG.slotDurationMin * 60000;
  const slots = [];
  let cursor = calStart.getTime();
  const endMs = calEnd.getTime();
  const nowMs = now.getTime();

  while (cursor + slotMs <= endMs) {
    // Skip past slots for today
    if (cursor > nowMs) {
      const conflict = busy.some(b => cursor < b.end && (cursor + slotMs) > b.start);
      if (!conflict) {
        const d = new Date(cursor);
        slots.push({
          start: Utilities.formatDate(d, tz, 'HH:mm'),
          end: Utilities.formatDate(new Date(cursor + slotMs), tz, 'HH:mm'),
          iso: Utilities.formatDate(d, tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        });
      }
    }
    cursor += slotMs;
  }

  return { date: dateStr, slots: slots };
}

/* ─── Create Booking ─── */
function createBooking(data) {
  const { name, email, message, date, startTime } = data;

  // Validate required fields
  if (!name || !email || !date || !startTime) {
    return { success: false, error: 'Missing required fields: name, email, date, startTime' };
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }

  const tz = CONFIG.timezone;
  
  // Get calendar and set timezone
  const calendar = CalendarApp.getCalendarById(CONFIG.calendarId) || CalendarApp.getDefaultCalendar();
  
  // Parse the date and time components
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Create ISO string with Bangkok timezone offset (+07:00)
  const isoStart = `${date}T${startTime}:00+07:00`;
  const startDate = new Date(isoStart);
  const endDate = new Date(startDate.getTime() + CONFIG.slotDurationMin * 60000);
  
  // Log for debugging
  Logger.log('Booking request: ' + date + ' ' + startTime);
  Logger.log('Start date created: ' + startDate.toISOString());
  Logger.log('Start date in Bangkok: ' + Utilities.formatDate(startDate, tz, 'yyyy-MM-dd HH:mm:ss'));

  // Double-check availability
  const conflicts = calendar.getEvents(startDate, endDate);
  if (conflicts.length > 0) {
    return { success: false, error: 'This slot is no longer available. Please choose another time.' };
  }

  // Create event
  const title = 'Consultation — ' + name;
  const description = [
    '📋 Consultation Request via workeron.ai',
    '',
    'Name: ' + name,
    'Email: ' + email,
    message ? 'Message: ' + message : '',
    '',
    '— Booked automatically by Workeron.ai booking system',
  ].join('\n');

  const event = calendar.createEvent(title, startDate, endDate, {
    description: description,
    guests: email,
    sendInvites: true,
  });

  event.setColor(CONFIG.eventColor);

  // Send confirmation email
  try {
    MailApp.sendEmail({
      to: email,
      subject: 'Consultation Confirmed — Workeron.ai',
      htmlBody: _confirmationEmail(name, date, startTime, Utilities.formatDate(endDate, tz, 'HH:mm')),
    });
  } catch (mailErr) {
    // Non-critical — event is already created
    Logger.log('Mail error: ' + mailErr.message);
  }

  return {
    success: true,
    eventId: event.getId(),
    message: 'Consultation booked for ' + date + ' at ' + startTime,
  };
}

/* ─── Helpers ─── */
function _pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function _jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _confirmationEmail(name, date, startTime, endTime) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0D10;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(165deg,#0E1714,#080C0F);border:1px solid rgba(115,240,209,0.15);border-radius:16px;padding:40px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:rgba(115,240,209,0.1);border:2px solid rgba(115,240,209,0.4);line-height:56px;font-size:24px;">✓</div>
    </div>
    <h1 style="color:#F1F4F6;font-size:22px;text-align:center;margin:0 0 8px;">Consultation Confirmed</h1>
    <p style="color:rgba(255,255,255,0.45);font-size:14px;text-align:center;margin:0 0 32px;">Hi ${name}, your consultation is booked.</p>
    <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(115,240,209,0.1);border-radius:12px;padding:24px;margin-bottom:32px;">
      <table style="width:100%;color:rgba(255,255,255,0.6);font-size:14px;">
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.35);">Date</td><td style="padding:8px 0;text-align:right;color:#F1F4F6;font-weight:600;">${date}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.35);">Time</td><td style="padding:8px 0;text-align:right;color:#73F0D1;font-weight:600;">${startTime} — ${endTime}</td></tr>
        <tr><td style="padding:8px 0;color:rgba(255,255,255,0.35);">Duration</td><td style="padding:8px 0;text-align:right;color:#F1F4F6;">30 minutes</td></tr>
      </table>
    </div>
    <p style="color:rgba(255,255,255,0.35);font-size:12px;text-align:center;margin:0;">A calendar invite has been sent to your email.<br>See you soon — Workeron.ai</p>
  </div>
</body>
</html>`;
}


/* ─── Test Functions ─── */
function testGetSlots() {
  const testDate = '2026-03-30'; // Monday
  const result = getAvailableSlots(testDate);
  Logger.log('Test getAvailableSlots result:');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testCreateBooking() {
  const testData = {
    name: 'Test User',
    email: 'test@example.com',
    message: 'Test booking',
    date: '2026-03-30',
    startTime: '15:30'
  };
  const result = createBooking(testData);
  Logger.log('Test createBooking result:');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
