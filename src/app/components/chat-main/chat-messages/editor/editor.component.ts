import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';

import { AuthService } from '../../../../services/auth/auth.service';
import { ChatService } from '../../../../services/chat/chat.service';
import { SocketsService } from '../../../../services/sockets/sockets.service';
import { BusService } from '../../../../services/bus/bus.service';

import { ChatInformationComponent } from '../../../modals/chat-information/chat-information.component';

import { ChatInformationModel } from '../../../../models/chat-information.model';
import { SocketMessageModel } from '../../../../models/socket.message.model';
import { ChatTypes } from '../../../../services/interfaces/chat-types.interfaces';
import { SCROLL_DOWN } from '../../../../actions/main.action';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.template.html',
  styleUrls: ['./editor.style.scss']
})
export class EditorComponent implements OnInit, OnDestroy {
  public message: string;
  public container: HTMLElement;
  public usersTyping = [];
  public typingTimeout = null;
  public startTyping = false;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    public dialog: MatDialog,
    public bus: BusService,
    public socketsService: SocketsService
  ) {}

  public ngOnInit() {
    this.socketsService.onMessage('notify-typing')
      .subscribe(data => this.notifyTyping(data));

    this.socketsService.onMessage('notify-stop-typing')
      .subscribe(data => this.stopTyping(data));
  }

  public openModal(type: string): void {
    this.dialog.open(ChatInformationComponent, {
      width: '450px',
      data: new ChatInformationModel(
        type === 'profile' ? ChatTypes.PROFILE : this.chatService.activeChat.chatType,

        type === 'profile' || (this.chatService.activeChat.admins.includes(this.authService.userData.id)
        && this.chatService.activeChat.chatType !== ChatTypes.DIALOG),

        type === 'profile' ? this.authService.userData.id
          : this.chatService.activeChat.chatType === ChatTypes.DIALOG
          ? this.chatService.activeChat.recipientId
          : this.chatService.activeChat._id
      )
    });
  }

  public typingMessage(): void {
    clearTimeout(this.typingTimeout);
    const messageData = {
      username: this.authService.userData.username,
      chatId: this.chatService.activeChat._id
    };
    if (!this.startTyping) {
      this.socketsService.send(new SocketMessageModel('typing', messageData));
      this.startTyping = true;
    }
    this.typingTimeout = setTimeout(() => {
      this.socketsService.send(new SocketMessageModel('stop-typing', messageData));
      this.startTyping = false;
    }, 3000);
  }

  public notifyTyping(data: any): void {
    if (this.chatService.activeChat._id === data.chatId && !this.usersTyping.includes(data.username)) {
      this.usersTyping.push(data.username);
    }
  }

  public stopTyping(data: any): void {
    if (this.chatService.activeChat._id === data.chatId) {
      const index = this.usersTyping.indexOf(data.username);
      if (index > -1) {
        this.usersTyping.splice(index, 1);
      }
    }
  }

  public sendMessage(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.message && this.message.trim()) {
      this.bus.publish(SCROLL_DOWN);
      this.socketsService.send(new SocketMessageModel('message', {
        authorId: this.authService.userData.id,
        chatId: this.chatService.activeChat._id,
        message: this.message
      }));
      this.message = '';
      this.startTyping = false;
      clearTimeout(this.typingTimeout);
    }
  }

  public ngOnDestroy(): void {
    clearTimeout(this.typingTimeout);
  }

}
