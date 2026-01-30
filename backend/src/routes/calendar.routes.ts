import { Router } from 'express';
import * as calendarController from '../controllers/calendar.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All calendar routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/calendars
 * @desc    Get list of all calendars
 * @access  Private
 */
router.get('/', calendarController.getCalendars);

/**
 * @route   GET /api/calendars/:calendarId
 * @desc    Get details of a specific calendar
 * @access  Private
 */
router.get('/:calendarId', calendarController.getCalendar);

/**
 * @route   GET /api/calendars/:calendarId/events
 * @desc    Get events from a specific calendar
 * @access  Private
 */
router.get('/:calendarId/events', calendarController.getEvents);

/**
 * @route   GET /api/calendars/:calendarId/events/:eventId
 * @desc    Get a specific event
 * @access  Private
 */
router.get('/:calendarId/events/:eventId', calendarController.getEvent);

/**
 * @route   POST /api/calendars/:calendarId/events
 * @desc    Create a new event
 * @access  Private
 */
router.post('/:calendarId/events', calendarController.createEvent);

/**
 * @route   PATCH /api/calendars/:calendarId/events/:eventId
 * @desc    Update an existing event
 * @access  Private
 */
router.patch('/:calendarId/events/:eventId', calendarController.updateEvent);

/**
 * @route   DELETE /api/calendars/:calendarId/events/:eventId
 * @desc    Delete an event
 * @access  Private
 */
router.delete('/:calendarId/events/:eventId', calendarController.deleteEvent);

export default router;
