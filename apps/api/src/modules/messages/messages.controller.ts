import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@xidmetal/shared';
import { MessagesService } from './messages.service';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationQueryDto,
  MessagesQueryDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'Oxunmamış mesajların ümumi sayı' })
  getUnreadCount(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messagesService.getUnreadSummary(userId, role);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Söhbətlər siyahısı' })
  findConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ConversationQueryDto,
  ) {
    return this.messagesService.findConversations(userId, role, query.page, query.limit);
  }

  @Delete('conversations/:id')
  @ApiOperation({
    summary: 'Söhbəti öz siyahısından sil (per-user; qarşı tərəfə təsir etmir)',
  })
  deleteConversation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messagesService.deleteConversation(id, userId, role);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Söhbət detalları və son mesajlar' })
  findConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.findConversation(id, userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Söhbətin mesajları (cursor pagination)' })
  findMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.messagesService.findMessages(id, userId, query.before, query.limit);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Söhbətdəki oxunmamış mesajları oxundu et' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.markConversationRead(id, userId);
  }

  @Post('conversations/:id/typing')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Yazır... siqnalı göndər (ephemeral, ~4s)' })
  setTyping(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.setTyping(id, userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Yeni söhbət yarat və ya mövcud olanı aç' })
  createConversation(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagesService.createConversation(userId, role, dto);
  }

  @Post('conversations/:id/messages')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Mesaj göndər' })
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(id, userId, dto);
  }
}
