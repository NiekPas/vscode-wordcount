// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, Selection, TextEditorSelectionChangeEvent, Range } from 'vscode';

// this method is called when your extension is activated. activation is
// controlled by the activation events defined in package.json
export function activate(ctx: ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Wordcount" is now active!');

	// create a new word counter
	let wordCounter = new WordCounter();
	let controller = new WordCounterController(wordCounter);

	// add to a list of disposables which are disposed when this extension
	// is deactivated again.
	ctx.subscriptions.push(controller);
	ctx.subscriptions.push(wordCounter);
}

export class WordCounter {

	private _statusBarItem: StatusBarItem;

	public updateWordCount(selections?: Selection[]) {

		// Create as needed
		if (!this._statusBarItem) {
			this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
		}

		// Get the current text editor
		let editor = window.activeTextEditor;
		if (!editor) {
			this._statusBarItem.hide();
			return;
		}

		let doc = editor.document;

		// Only update status if an MD file
		if (doc.languageId === "markdown") {
			let wordCount;
			let statusBarItemText;
			if (selections !== null && selections !== undefined && selections.length > 0) {
				const wordCount = this._getWordCountForSelections(doc, selections);
				const docWordCount = this._getWordCountForDoc(doc);
				statusBarItemText =
					docWordCount !== 1
						? `$(pencil) ${wordCount} of ${docWordCount} Words`
						: `$(pencil) ${wordCount} of ${docWordCount} Word`
			}

			else {
				const wordCount = this._getWordCountForDoc(doc);
				statusBarItemText =
					wordCount !== 1
						? `$(pencil) ${wordCount} Words`
						: '$(pencil) 1 Word';
			}

			// Update the status bar
			this._statusBarItem.text = statusBarItemText;
			this._statusBarItem.show();
		} else {
			this._statusBarItem.hide();
		}
	}

	public _getWordCountForDoc(doc: TextDocument): number {
		return this.countWords(doc.getText());
	}

	public _getWordCountForSelections(doc: TextDocument, selections: Selection[]): number {
		return selections.map(s => {
			const text = doc.getText(new Range(s.start, s.end));
			return this.countWords(text);
		}).reduce((acc, n) => acc + n);
	}

	private countWords(text: string): number {
		// Parse out unwanted whitespace so the split is accurate
		text = text.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, ' ');
		text = text.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

		let wordCount = 0;
		if (text != "") {
			wordCount = text.split(" ").length;
		}

		return wordCount;
	}

	public dispose() {
		this._statusBarItem.dispose();
	}
}

class WordCounterController {

	private _wordCounter: WordCounter;
	private _disposable: Disposable;

	constructor(wordCounter: WordCounter) {
		this._wordCounter = wordCounter;
		this._wordCounter.updateWordCount();

		// subscribe to selection change and editor activation events
		let subscriptions: Disposable[] = [];
		window.onDidChangeTextEditorSelection(this._onSelectionEvent, this, subscriptions);
		window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

		// create a combined disposable from both event subscriptions
		this._disposable = Disposable.from(...subscriptions);
	}

	private _onEvent() {
		this._wordCounter.updateWordCount();
	}

	private _onSelectionEvent(e: TextEditorSelectionChangeEvent) {
		// If all selections are empty, count the whole document
		if (e.selections.every(s => s.isEmpty)) {
			this._wordCounter.updateWordCount();
		}
		else {
			this._wordCounter.updateWordCount(e.selections);
		}
	}

	public dispose() {
		this._disposable.dispose();
	}
}
