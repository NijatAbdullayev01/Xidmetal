import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
@ApiTags('Realtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('realtime')
export class RealtimeController {
  @Get('socket-token')
  @ApiOperation({
    summary: 'WebSocket sessiyasının hazır olduğunu yoxla',
  })
  socketSession(): { authenticated: true } {
    return { authenticated: true };
  }
}
