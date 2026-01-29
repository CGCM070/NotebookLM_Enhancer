import { Component, NgZone, OnDestroy } from '@angular/core';

type NotebookItem = {
  title: string;
  details: string | null;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  title = 'NotebookLM_Enhancer';

  notebooks: NotebookItem[] = [];

  private readonly onMessage: (event: MessageEvent) => void;

  constructor(private readonly ngZone: NgZone) {
    this.onMessage = (event: MessageEvent) => {
      // Messages come from the NotebookLM page context via the content script.
      if (event.origin !== 'https://notebooklm.google.com') return;
      if (!event.data || typeof event.data !== 'object') return;

      const data = event.data as { type?: unknown; payload?: unknown };
      if (data.type !== 'NLE_NOTEBOOKS_SYNC') return;

      const payload = data.payload as { notebooks?: unknown };
      const notebooks = payload.notebooks;
      if (!Array.isArray(notebooks)) return;

      this.ngZone.run(() => {
        this.notebooks = notebooks
          .map((n) => {
            if (!n || typeof n !== 'object') return null;
            const nn = n as { title?: unknown; details?: unknown };
            if (typeof nn.title !== 'string') return null;
            const details = typeof nn.details === 'string' ? nn.details : null;
            return { title: nn.title, details } satisfies NotebookItem;
          })
          .filter((n): n is NotebookItem => n !== null);
      });
    };

    window.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
  }
}
