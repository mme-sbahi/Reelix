import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API health check' })
  @ApiOkResponse({ description: 'Service is running' })
  root() {
    return {
      name: 'hypertube API',
      status: 'ok',
      docs: '/api',
    };
  }
}
