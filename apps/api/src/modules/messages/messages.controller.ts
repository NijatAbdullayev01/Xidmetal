import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateConversationDto, SendMessageDto, ConversationQueryDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Söhbətlər siyahısı' })
  findConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: ConversationQueryDto,
  ) {
    return this.messagesService.findConversations(userId, role, query.page, query.limit);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Söhbət detalları və mesajlar' })
  findConversation(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.findConversation(id, userId);
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
  @ApiOperation({ summary: 'Mesaj göndər' })
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(id, userId, dto);
  }
}
