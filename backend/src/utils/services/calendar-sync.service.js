const { google } = require('googleapis');
const User = require('../models/User');
const Task = require('../models/Task');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * Optional Google Calendar two-way sync. Requires GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI to be set — feature is a no-op
 * (throws a clear error) if not configured, rather than silently failing.
 */
class CalendarSyncService {
  getOAuthClient() {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google Calendar integration is not configured on this server');
    }
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl() {
    const client = this.getOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
    });
  }

  async connectAccount(userId, authCode) {
    const client = this.getOAuthClient();
    const { tokens } = await client.getToken(authCode);

    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    await User.findByIdAndUpdate(userId, {
      'integrations.googleCalendar.connected': true,
      'integrations.googleCalendar.accessToken': JSON.stringify(encryptedAccess),
      ...(encryptedRefresh ? { 'integrations.googleCalendar.refreshToken': JSON.stringify(encryptedRefresh) } : {}),
      'integrations.googleCalendar.syncEnabled': true,
      'integrations.googleCalendar.lastSyncAt': new Date(),
    });
  }

  async getAuthenticatedClient(user) {
    const client = this.getOAuthClient();
    const gcal = user.integrations?.googleCalendar;
    if (!gcal?.connected) throw new Error('Google Calendar not connected for this user');

    const accessTokenData = JSON.parse(gcal.accessToken);
    const accessToken = decrypt(accessTokenData.encryptedData, accessTokenData.iv, accessTokenData.authTag);

    let refreshToken;
    if (gcal.refreshToken) {
      const refreshTokenData = JSON.parse(gcal.refreshToken);
      refreshToken = decrypt(refreshTokenData.encryptedData, refreshTokenData.iv, refreshTokenData.authTag);
    }

    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return client;
  }

  async syncTaskToCalendar(userId, task) {
    const user = await User.findById(userId);
    const client = await this.getAuthenticatedClient(user);
    const calendar = google.calendar({ version: 'v3', auth: client });

    const event = {
      summary: task.title,
      description: task.description,
      start: { dateTime: task.scheduledStartTime?.toISOString() },
      end: { dateTime: task.scheduledEndTime?.toISOString() },
    };

    const result = await calendar.events.insert({ calendarId: 'primary', requestBody: event });
    return result.data;
  }

  async importUpcomingEvents(userId, timeMin, timeMax) {
    const user = await User.findById(userId);
    const client = await this.getAuthenticatedClient(user);
    const calendar = google.calendar({ version: 'v3', auth: client });

    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    await User.findByIdAndUpdate(userId, { 'integrations.googleCalendar.lastSyncAt': new Date() });
    logger.info(`Imported ${result.data.items?.length || 0} calendar events for user ${userId}`);
    return result.data.items || [];
  }
}

module.exports = { CalendarSyncService };
