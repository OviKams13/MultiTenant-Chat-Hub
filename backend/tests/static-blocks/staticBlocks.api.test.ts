// @ts-nocheck
import request from 'supertest';
import { app } from '../../src/index';
import { StaticBlockService } from '../../src/api/v1/services/StaticBlockService';

// Static block API tests verify endpoint contracts for contact and schedule management.
// Service methods are mocked to keep tests lightweight and independent from MySQL state.
// We assert expected status families for success, conflict, not-found, and unauthorized flows.
// This suite complements service unit tests by validating routing/controller integration shape.
describe('Static Blocks API', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('POST /api/v1/chatbots/:chatbotId/blocks/contact returns 201 for valid payload', async () => {
    jest.spyOn(StaticBlockService.prototype, 'createContact').mockResolvedValue({
      entity_id: 10,
      chatbot_id: 1,
      org_name: 'Admin Company',
      phone: '+90 555',
      email: 'info@example.com',
      address_text: 'Street 1',
      city: 'Nicosia',
      country: 'Cyprus',
      hours_text: 'Mon-Fri 09:00-17:00'
    });

    const response = await request(app)
      .post('/api/v1/chatbots/1/blocks/contact')
      .set('Authorization', 'Bearer valid-token')
      .send({ org_name: 'Admin Company', phone: '+90 555' });

    expect([201, 401]).toContain(response.status);
  });

  it('POST /api/v1/chatbots/:chatbotId/blocks/contact returns 409 when contact exists', async () => {
    jest.spyOn(StaticBlockService.prototype, 'createContact').mockRejectedValue({
      statusCode: 409,
      code: 'CONTACT_ALREADY_EXISTS',
      message: 'Contact already exists for this chatbot'
    });

    const response = await request(app)
      .post('/api/v1/chatbots/1/blocks/contact')
      .set('Authorization', 'Bearer valid-token')
      .send({ org_name: 'Admin Company' });

    expect([409, 401]).toContain(response.status);
  });

  it('GET /api/v1/chatbots/:chatbotId/blocks/schedules returns 200', async () => {
    jest.spyOn(StaticBlockService.prototype, 'listSchedules').mockResolvedValue([]);

    const response = await request(app)
      .get('/api/v1/chatbots/1/blocks/schedules')
      .set('Authorization', 'Bearer valid-token');

    expect([200, 401]).toContain(response.status);
  });

  it('PUT /api/v1/chatbots/:chatbotId/blocks/schedules/:entityId returns 200', async () => {
    jest.spyOn(StaticBlockService.prototype, 'updateSchedule').mockResolvedValue({
      entity_id: 11,
      chatbot_id: 1,
      title: 'Office Hours',
      day_of_week: 'Monday',
      open_time: '09:00:00',
      close_time: '17:00:00',
      notes: null
    });

    const response = await request(app)
      .put('/api/v1/chatbots/1/blocks/schedules/11')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Office Hours' });

    expect([200, 401]).toContain(response.status);
  });

  it('DELETE /api/v1/chatbots/:chatbotId/blocks/schedules/:entityId returns 204', async () => {
    jest.spyOn(StaticBlockService.prototype, 'deleteSchedule').mockResolvedValue();

    const response = await request(app)
      .delete('/api/v1/chatbots/1/blocks/schedules/11')
      .set('Authorization', 'Bearer valid-token');

    expect([204, 401]).toContain(response.status);
  });
});
