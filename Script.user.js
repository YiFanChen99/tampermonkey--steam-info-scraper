// ==UserScript==
// @name         Steam-info-scraper
// @namespace    https://github.com/YiFanChen99/tampermonkey--steam-info-scraper
// @version      1.2.0
// @description  As title
// @author       YiFanChen99
// @match        *://store.steampowered.com/app/*
// @grant        none
// @icon         https://raw.githubusercontent.com/YiFanChen99/tampermonkey--steam-info-scraper/main/logo.png
// @downloadURL  https://raw.githubusercontent.com/YiFanChen99/tampermonkey--steam-info-scraper/main/Script.user.js
// @updateURL    https://raw.githubusercontent.com/YiFanChen99/tampermonkey--steam-info-scraper/main/Script.meta.js
// ==/UserScript==

'use strict';

class ClipboardWriter {
	static writeTexts(texts) {
		const text = texts.join('\t');

		return new Promise(function(resolve, reject) {
			var success = false;
			function listener(e) {
				e.clipboardData.setData("text/plain", text);
				e.preventDefault();
				success = true;
			}
			document.addEventListener("copy", listener);
			document.execCommand("copy");
			document.removeEventListener("copy", listener);
			success ? resolve(): reject();
		});
	};
}


class Scraper {
	constructor() {
		this.results = [];
	}

	scrap() {
		this.results = [];

		this.results.push(this._scrapTitleAndUrl());
		this.results.push(this._scrapOriginPrice());
		this.results.push(this._scrapBestOff());
		this.results.push(this._scrapPublicDate());
		this.results.push(this._scrapScore());
		this.results.push(this._scrapCurrentDate());

		return this.results;
	}

	_scrapTitleAndUrl() {
		let title = document.querySelector('.apphub_AppName')?.innerText;

		let url = document.querySelector('.blockbg>a:last-child')?.baseURI;
		url = url?.replace(/(.*?app\/\d+\/).*/, '$1');

		return `=HYPERLINK("${url}","${title}")`;
	}

	_scrapOriginPrice() {
		const parentCls = '.sih_game_node .game_purchase_action';
		let price = document.querySelector(`${parentCls} .discount_original_price, ${parentCls} .game_purchase_price`)?.innerText;

		var pattern = /.*?([\d,]+).*/;
		return price?.replace(pattern, '$1');
	}

	_scrapBestOff() {
		let bestOff = document.body.querySelector('.steamdb_prices_top')?.innerText;

		var pattern = /.*at.-(\d+)%.*/;
		return bestOff?.match(pattern) ? bestOff?.replace(pattern, '$1') : '0';
	}

	_scrapPublicDate() {
		let date = document.querySelector('.release_date .date')?.innerText;

		var pattern = /(\d{4}).*?(\d{1,2}).*?(\d{1,2}).*/;
		return date?.replace(pattern, '$1/$2/$3');
	}

	_scrapScore() {
		// There are 30-days(maybe) and all-days, we want the second one
		let scores = document.querySelectorAll('.nonresponsive_hidden.responsive_reviewdesc');
		let score = scores[scores.length - 1]?.innerText;

		var pattern = /.*?(\d+)%.*/s;
		return score?.replace(pattern, '$1');
	}

	_scrapCurrentDate() {
		return new Date().toLocaleDateString();
	}
}


class Logger {
	static info() {
		let args = Array.from(arguments);
		args.splice(0, 0, '[SteamScraper]');
		console.log.apply(console, args);
	}

	static error() {
		let args = Array.from(arguments);
		args.splice(0, 0, '[SteamScraper]');
		console.error.apply(console, args);
	}
}

window.scrapeSteam = () => {
	Logger.info('Start to scrap steam info ...');
	let infos = new Scraper().scrap();

	Logger.info('Scraped info:', infos);

	ClipboardWriter.writeTexts(infos)
		.then(() => {
			Logger.info('Clipboard written.');
		})
		.catch(() => {
			Logger.error('Failed to write to the clipboard, args:', arguments);
			return infos;
		}
	);
};

function createScrapeButton() {
	const btn = document.createElement('button');

	btn.style.height = '32pt';
	btn.style.width = '80pt';

	btn.innerText = 'Scrape info';

	btn.addEventListener('click', window.scrapeSteam);

	return btn;
}

function createLangLabel() {
	const label = document.createElement('p');

	label.style.fontSize = '14pt';
	label.style.display = 'inline';
	label.style.marginRight = '5px';

	function scrapeLangInfo() {
		function isLangSupported(langTable, name) {
			const res = document.evaluate(`//td[contains(., \'${name}\')]`, langTable, null, XPathResult.ANY_TYPE, null ).iterateNext();
			if (!res) {
				return false;
			}
			return res.nextElementSibling.innerText.includes('✔');
		}

		const languageTable = document.body.querySelector('#languageTable');
		if (!languageTable) {
			return '!';
		}

		if (isLangSupported(languageTable, '繁體中文')) {
			return '繁';
		} else if  (isLangSupported(languageTable, '簡體中文')) {
			return '簡';
		} else if  (isLangSupported(languageTable, '英文')) {
			return '英';
		} else {
			return 'X';
		}
	}
	label.innerText = scrapeLangInfo();

	label.addEventListener('click', () => {
		ClipboardWriter.writeTexts([label.innerText]);
	});

	return label;
}

function addMyUi() {
	const area = document.createElement('div');

	area.id = 'SteamScraperUi';
	area.style.position = 'fixed';
	area.style.right = '25px';
	area.style.top = '20px';
	area.style.zIndex = '50';

	document.body.appendChild(area);

	area.appendChild(createLangLabel());
	area.appendChild(createScrapeButton());
}

addMyUi();
