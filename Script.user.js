// ==UserScript==
// @name         Steam-info-scraper
// @namespace    https://github.com/YiFanChen99/tampermonkey--steam-info-scraper
// @version      1.3.12
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


class SteamBasicParser {
	static parseToClipboard(options) {
		Logger.info('Start to parse steam info ...');
		const infos = new SteamBasicParser().parse(options);

		Logger.info('Parsed info:', infos);

		ClipboardWriter.writeTexts(infos)
			.then(() => {
				Logger.info('Clipboard written.');
			})
			.catch(() => {
				Logger.error('Failed to write to the clipboard, args:', arguments);
				return infos;
			}
		);
	}

	constructor() {
		this.results = [];
	}

	parse(options) {
		this.results = [];

		if (options?.skipTitle !== true) {
			this.results.push(this._parseTitleAndUrl());
		}
		this.results.push(this._parseOriginPrice());
		this.results.push(this._parseBestOff());
		this.results.push(SteamBasicParser.parsePublicDate());
		this.results.push(this._parseScore());
		this.results.push(this._parseCurrentDate());

		return this.results;
	}

	_parseTitleAndUrl() {
		let title = document.querySelector('.apphub_AppName')?.innerText;

		let url = document.querySelector('.blockbg>a:last-child')?.baseURI;
		url = url?.replace(/(.*?app\/\d+\/).*/, '$1');

		return `=HYPERLINK("${url}","${title}")`;
	}

	/**
	 * @return string
	 */
	_parseOriginPrice() {
		try {
			const parentCls = '.game_area_purchase_game:not(.game_area_purchase_game_dropdown_subscription):not(.demo_above_purchase) .game_purchase_action';
			let priceRaw = document.querySelector(`${parentCls} .discount_original_price, ${parentCls} .game_purchase_price`)?.innerText;

			if (priceRaw.includes('free') || priceRaw.includes('免費')) {
				return '0';
			}

			var pattern = /.*?([\d,]+).*/;
			const result = priceRaw?.replace(pattern, '$1').replaceAll(/,/g, '');

			Logger.debug(`'_parseOriginPrice' find raw '${priceRaw}' and result '${result}'`);
			return result;
		} catch(e) {
			Logger.error('Error on _parseOriginPrice, %o', e);
			return '10000'; // fallback
		}
	}

	_parseBestOff() {
		const originPrice = this._parseOriginPrice();

		if (originPrice === '0' || originPrice === '10000') {
			return '100';
		}

		let bestPriceRaw = document.body.querySelector('.steamdb_prices_top')?.innerText;
		const pattern = /\$\s?(\d+)/;
		const matched = bestPriceRaw.match(pattern);
		const price = (matched ? matched[1] : originPrice).replaceAll(/,/g, '');
		const result = `${Math.round((1 - price / originPrice) * 100)}`;

		Logger.debug(`'_parseBestOff' find raw '${bestPriceRaw}' and result '${result}'`);
		return result;
	}

	static parsePublicDate() {
		let date = document.querySelector('.release_date .date')?.innerText;

		var pattern = /(\d{4}).*?(\d{1,2}).*?(\d{1,2}).*/;
		return date?.replace(pattern, '$1/$2/$3');
	}

	_parseScore() {
		// There are 30-days(maybe) and all-days, we want the second one
		let scores = document.querySelectorAll('.nonresponsive_hidden.responsive_reviewdesc');
		let score = scores[scores.length - 1]?.innerText;

		var pattern = /.*?(\d+)%.*/s;
		return score?.replace(pattern, '$1');
	}

	_parseCurrentDate() {
		return new Date().toLocaleDateString();
	}
}


class SteamAdditionParser {
	static parseToClipboard(options) {
		const infos = [new SteamAdditionParser().parse(options)];
		ClipboardWriter.writeTexts(infos)
			.then(() => {
				Logger.info('Clipboard written.');
			})
			.catch(() => {
				Logger.error('Failed to write to the clipboard, args:', arguments);
				return infos;
			}
		);
	}

	static parseEaInfo() {
		const isEa = (document.body.querySelector('.inset')?.textContent === '搶先體驗遊戲');
		if (!isEa) {
			return '';
		}
		return `${SteamBasicParser.parsePublicDate()}EA。`;
	}

	static parseLangInfo() {
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
		} else if (isLangSupported(languageTable, '簡體中文')) {
			return '簡';
		} else if (isLangSupported(languageTable, '英文')) {
			return '英';
		} else {
			return 'X';
		}
	}

	static parseHoursInfo() {
		const hourDoms = document.querySelectorAll('.hours.ellipsis');
		const hours = Array.from(hourDoms, (dom) => {
			return parseFloat(dom.innerText.match(/[^0-9]*([0-9\.]+)[^0-9.]*/)[1]);
		}).sort((a, b) => (a - b));

		function getMedian(values) {
			const half = Math.floor(values.length / 2);
			return (values.length % 2) ? values[half] : ((values[half - 1] + values[half]) / 2.0);
		}

		function getThMax(values, numberTh) {
			if (values.length < 5) {
				return undefined;
			}
			return values.at(-numberTh);
		}

		return `中位${Math.round(getMedian(hours))}H，3rd.高${Math.round(getThMax(hours, 3))}H。`;
	}

	constructor() {}

	parse(options) {
		return `${SteamAdditionParser.parseEaInfo()}${SteamAdditionParser.parseLangInfo()}。${SteamAdditionParser.parseHoursInfo()}`;
	}
}


class Logger {
	static info() {
		let args = Array.from(arguments);
		args.splice(0, 0, '[SteamParser]');
		console.log.apply(console, args);
	}

	static debug() {
		let args = Array.from(arguments);
		args.splice(0, 0, '[SteamParser]');
		console.debug.apply(console, args);
	}

	static error() {
		let args = Array.from(arguments);
		args.splice(0, 0, '[SteamParser]');
		console.error.apply(console, args);
	}
}


function createParseButton() {
	const height = '32px';

	const container = document.createElement('div');
	container.style.height = height;

	const wholeBtn = document.createElement('button');
	wholeBtn.innerText = 'Parse info';
	wholeBtn.style.height = height;
	wholeBtn.style.width = '106px';
	wholeBtn.id = 'ekko-parser-whole';
	wholeBtn.addEventListener('click', SteamBasicParser.parseToClipboard);

	const skipTitleBtn = document.createElement('button');
	skipTitleBtn.innerText = '(!title)';
	skipTitleBtn.style.height = height;
	skipTitleBtn.style.width = '42px';
	skipTitleBtn.style.fontSize = '10pt';
	skipTitleBtn.id = 'ekko-parser-without-title';
	skipTitleBtn.addEventListener('click', SteamBasicParser.parseToClipboard.bind(undefined, { skipTitle: true }));

	const additionBtn = document.createElement('button');
	additionBtn.innerText = 'detail';
	additionBtn.style.height = height;
	additionBtn.style.width = '65px';
	additionBtn.style.marginLeft = '5px';
	additionBtn.id = 'ekko-parser-additional';
	additionBtn.addEventListener('click', SteamAdditionParser.parseToClipboard);

	container.appendChild(wholeBtn);
	container.appendChild(skipTitleBtn);
	container.appendChild(additionBtn);
	return container;
}

function addMyUi() {
	const area = document.createElement('div');

	area.id = 'SteamScraperUi';
	area.style.position = 'fixed';
	area.style.right = '25px';
	area.style.top = '20px';
	area.style.zIndex = '50';

	document.body.appendChild(area);

	area.appendChild(createParseButton());
}

addMyUi();

// FIXME: maybe uneffective?
window.ekkodev = {
	parseB: (options) => (SteamBasicParser.parseToClipboard(options)),
	parseA: (options) => (SteamAdditionParser.parseToClipboard(options)),
	getBasicParser: () => (new SteamBasicParser()),
	getAdditionParser: () => (new SteamAdditionParser()),
};
Logger.info('You can debug with `ekkodev`', ekkodev);
