import { Component } from '@angular/core';
import { TypingTest } from './engine/typing-test';

@Component({
  selector: 'app-root',
  imports: [TypingTest],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}