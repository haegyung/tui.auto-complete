(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ne.util.defineNamespace('ne.component.AutoComplete', require('./src/js/AutoComplete'));

},{"./src/js/AutoComplete":2}],2:[function(require,module,exports){
/**
 * @fileoverview Core element. All of auto complete objects belong with this object.
 * @version 1.1.0
 * @author NHN Entertainment FE Dev Team. Jein Yi<jein.yi@nhnent.com>
*/

var DataManager = require('./DataManager');
var InputManager = require('./InputManager');
var ResultManager = require('./ResultManager');

/**
 @constructor
 @param {Object} htOptions
 @example
    var autoCompleteObj = new ne.component.AutoComplete({
       "configId" : "Default"    // Dataset in autoConfig.js
    });
    /**
    The form of config file "autoConfig.js"
    {
        Default = {
        // Result element
        'resultListElement': '._resultBox',

        // Input element
        'searchBoxElement':  '#ac_input1',

        // Hidden element that is for throwing query that user type.
        'orgQueryElement' : '#org_query',

        // on,off Button element
        'toggleBtnElement' : $("#onoffBtn"),

        // on,off State element
        'onoffTextElement' : $(".baseBox .bottom"),

        // on, off State image source
        'toggleImg' : {
            'on' : '../img/btn_on.jpg',
            'off' : '../img/btn_off.jpg'
        },

        // Collection items each count.
        'viewCount' : 3,

        // Key arrays (sub query keys' array)
        'subQuerySet': [
            ['key1', 'key2', 'key3'],
            ['dep1', 'dep2', 'dep3'],
            ['ch1', 'ch2', 'ch3'],
            ['cid']
        ],

        // Config for auto complete list by index of collection
        'listConfig': {
            '0': {
                'template': 'department',
                'subQuerySet' : 0,
                'action': 0
            },
            '1': {
                'template': 'srch_in_department',
                'subQuerySet' : 1,
                'action': 0
            },
            '2': {
                'template': 'srch_in_department',
                'subQuerySet' : 2,
                'action': 1,
                'staticParams': 0
            },
            '3': {
                'template': 'department',
                'subQuerySet' : 0,
                'action': 1,
                'staticParams': 1
            }
        },

         // Mark up for each collection. (Default markup is defaults.)
         // This markup has to have "keywold-field" but title.
         'template' :  {
                department:    {
                    element: '<li class="department">' +
                                '<span class="slot-field">Shop the</span> ' +
                                '<a href="#" class="keyword-field">@subject@</a> ' +
                                '<span class="slot-field">Store</span>' +
                             '</li>',
                     attr: ['subject']
         },
         srch : {
                    element: '<li class="srch"><span class="keyword-field">@subject@</span></li>',
                    attr: ['subject']
         },
         srch_in_department :    {
                    element: '<li class="inDepartment">' +
                                '<a href="#" class="keyword-field">@subject@</a> ' +
                                 '<span class="slot-field">in </span>' +
                                 '<span class="depart-field">@department@</span>' +
                             '</li>',
                     attr: ['subject', 'department']
         },
         title: {
                    element: '<li class="title"><span>@title@</span></li>',
                    attr: ['title']
         },
         defaults: {
                    element: '<li class="srch"><span class="keyword-field">@subject@</span></li>',
                    attr: ['subject']
         }
         },

         // Action attribute for each collection
         'actions': [
             "http://www.fashiongo.net/catalog.aspx",
             "http://www.fashiongo.net/search2.aspx"
         ],

         // Set static options for each collection.
         'staticParams':[
             "qt=ProductName",
             "at=TEST,bt=ACT"
         ],

         // Whether use title or not.
         'useTitle': true,

         // Form element that include search element
         'formElement' : '#ac_form1',

         // Cookie name for save state
         'cookieName' : "usecookie",

         // Class name for selected element
         'mouseOverClass' : 'emp',

         // Auto complete API
         'searchUrl' : 'http://10.24.136.172:20011/ac',

         // Auto complete API request config
         'searchApi' : {
                'st' : 1111,
                'r_lt' : 1111,
                'r_enc' : 'UTF-8',
                'q_enc' : 'UTF-8',
                'r_format' : 'json'
            }
       }
    }

*/
var AutoComplete = ne.util.defineClass(/**@lends ne.component.AutoComplete.prototype */{

    /**
     * Direction value for key
     */
    flowMap: {
        'NEXT': 'next',
        'PREV': 'prev',
        'FIRST': 'first',
        'LAST': 'last'
    },
    /**
     * Interval for check update input
     */
    watchInterval: 200,

    /**
     * Initialize
     * @param {Object} htOptions autoconfig values
     */
    init: function(htOptions) {
        this.options = {};

        if (!this._checkValidation(htOptions)) {
            return;
        }

        var cookieValue,
            defaultCookieName = '_atcp_use_cookie';

        if (!this.options.toggleImg || !this.options.onoffTextElement) {
            this.isUse = true;
            delete this.options.onoffTextElement;
        } else {
            cookieValue = $.cookie(this.options.cookieName);
            this.isUse = !!(cookieValue === 'use' || !cookieValue);
        }

        if (!this.options.cookieName) {
            this.options.cookieName = defaultCookieName;
        }

        this.options.watchInterval = ne.util.isExisty(this.options.watchInterval) ? this.options.watchInterval : this.watchInterval;

        this.dataManager = new DataManager(this, this.options);
        this.inputManager = new InputManager(this, this.options);
        this.resultManager = new ResultManager(this, this.options);

        /**
         * Save matched input english string with Korean.
         * @type {null}
         */
        this.querys = null;
        this.isIdle = true;

        this.setToggleBtnImg(this.isUse);
        this.setCookieValue(this.isUse);
    },

    /**
     * Check required fields and validate fields.
     * @param {Object} htOptions component configurations
     * @return {Boolean}
     * @private
     */
    _checkValidation: function(htOptions) {
        var config,
            configArr;

        config = htOptions.config;

        if (!ne.util.isExisty(config)) {
            throw new Error('Config file is not avaliable. #' + config);
            return false;
        }

        configArr = ne.util.keys(config);

        var configLen = configArr.length,
            i,
            requiredFields = [
                'resultListElement',
                'searchBoxElement' ,
                'orgQueryElement',
                'subQuerySet',
                'template',
                'listConfig',
                'actions',
                'formElement',
                'searchUrl',
                'searchApi'
            ],
            checkedFields = [];

        for (i = 0; i < configLen; i++) {
            if (ne.util.inArray(configArr[i], requiredFields, 0) >= 0) {
                checkedFields.push(configArr[i]);
            }
        }

        ne.util.forEach(requiredFields, function(el) {
            if (ne.util.inArray(el, checkedFields, 0) === -1) {
                throw new Error(el + 'does not not exist.');
                return false;
            }

            if (el === 'searchApi' && config['searchApi']) {
                if (!config.searchUrl ||
                    !config.searchApi.st ||
                    !config.searchApi.r_lt) {
                    alert('searchApi required value does not exist.');
                    return false;
                }
            }
        });

        for (i = 0; i < configLen; i++) {
            var configName = configArr[i],
                configValue = config[configName];

            if (typeof configValue === 'string' &&
               (configValue.charAt(0) === '.' || configValue.charAt(0) === '#')) {
                this.options[configName] = $(configValue);
            } else {
                this.options[configName] = config[configName];
            }
        }

        return true;
    },

    /**
     * Request data at api server with keyword
     * @param {String} keyword The key word to send to Auto complete API
     */
    request: function(keyword) {
        this.dataManager.request(keyword);
    },

    /**
     * Return string in input element.
     * @return {String}
     */
    getValue: function() {
        return this.inputManager.getValue();
    },

    /**
     * Set inputManager's value to show at search element
     * @param {String} keyword The string to show up at search element
     */
    setValue: function(keyword) {
        this.inputManager.setValue(keyword);
    },

    /**
     * Request to create addition parameters at inputManager.
     * @param {string} paramStr String to be addition parameters.(saperator '&')
     */
    setParams: function(paramStr, type) {
        this.inputManager.setParams(paramStr, type);
    },

    /**
     * Request to draw result at resultManager with data from api server.
     * @param {Array} dataArr Data array from api server
     */
    setServerData: function(dataArr) {
        this.resultManager.draw(dataArr);
    },

    /**
     * Set Cookie value with whether use auto complete or not
     * @param {Boolean} isUse Whether use auto complete or not
     */
    setCookieValue: function(isUse) {
        $.cookie(this.options.cookieName, isUse ? 'use' : 'notUse');
        this.isUse = isUse;
        this.setToggleBtnImg(isUse);
    },

    /**
     * Save Korean that is matched real query.
     * @param {array} querys Result qureys
     */
    setQuerys: function(querys) {
        this.querys = [].concat(querys);
    },

    /**
     * Get whether use auto complete or not
     *  @return {Boolean}
     */
    isUseAutoComplete: function() {
        return this.isUse;
    },

    /**
     * Get whether result list area show or not
     * @return {Boolean}
     */
    isShowResultList: function() {
        return this.resultManager.isShowResultList();
    },

    /**
     * Change toggle button image by auto complete state
     * @param {Boolean} isUse whether use auto complete or not
     */
    setToggleBtnImg: function(isUse) {
        this.inputManager.setToggleBtnImg(isUse);
    },

    /**
     * Hide search result list area
     */
    hideResultList: function() {
        if (this.isUseAutoComplete()) {
            this.resultManager.hideResultList();
        }
    },

    /**
     * Show search result list area
     */
    showResultList: function() {
        if (this.isUseAutoComplete()) {
            this.resultManager.showResultList();
        }
    },

    /**
     * Move to next item in result list.
     * @param {string} flow Direction to move.
     */
    moveNextList: function(flow) {
        this.resultManager.moveNextList(flow);
    },

    /**
     * Set text to auto complete switch
     * @param {Boolean} isUse Whether use auto complete or not
     */
    changeOnOffText: function(isUse) {
        this.resultManager.changeOnOffText(isUse);
    },

    /**
     * Return resultManager whether locked or not
     * @return {Boolean} resultManager의 isMoved값
     */
    getMoved: function() {
        return this.resultManager.isMoved;
    },

    /**
     * Set resultManager's isMoved field
     * @param {Boolean} isMoved Whether locked or not.
     */
    setMoved: function(moved) {
        this.resultManager.isMoved = moved;
    },

    /**
     * Reset serachApi
     * @param {Object} options searchApi옵션 설정
     * @example
     *  autoComplete.setSearchApi({
     *      'st' : 9351,
     *      'r_lt' : 7187,
     *      'r_enc' : 'UTF-8',
     *      'q_enc' : 'UTF-8',
     *      'r_format' : 'json'
     *  });
     */
    setSearchApi: function(options) {
        ne.util.extend(this.options.searchApi, options);
    },

    /**
     * clear ready value and set idle state
     */
    clearReadyValue: function() {
        if (ne.util.isExisty(this.readyValue)) {
            this.request(this.readyValue);
        } else {
            this.isIdle = true;
        }
        this.readyValue = null;
    }
});
ne.util.CustomEvents.mixin(AutoComplete);
module.exports = AutoComplete;

},{"./DataManager":3,"./InputManager":4,"./ResultManager":5}],3:[function(require,module,exports){
/**
 * @fileoverview DataManager that request data at api with input query
 * @version 1.1.0
 * @author NHN Entertainment FE dev team. Jein Yi<jein.yi@nhnent.com>
 */

/**
 * Unit of auto complete connecting server.
 * @constructor
 */
var DataManager = ne.util.defineClass(/**@lends DataManager.prototype */{
    init: function(autoCompleteObj, options) {
        if (arguments.length != 2) {
            alert('argument length error !');
            return;
        }

        this.autoCompleteObj = autoCompleteObj;
        this.options = options;
    },

    /**
     * Request data at api server use jsonp
     * @param {String} keyword String to request at server
     */
    request: function(keyword) {

        var rsKeyWrod = keyword.replace(/\s/g, '');

        if (!keyword || !rsKeyWrod) {
            this.autoCompleteObj.hideResultList();
            return;
        }

        var dataCallback = function(){},
            defaultParam = {
                q: keyword,
                r_enc: 'UTF-8',
                q_enc: 'UTF-8',
                r_format: 'json',
                _callback: 'dataCallback'
            },
            requestParam = ne.util.extend(this.options.searchApi, defaultParam),
            keyDatas;

        $.ajax(this.options.searchUrl, {
            'dataType': 'jsonp',
            'jsonpCallback': 'dataCallback',
            'data': requestParam,
            'type': 'get',
            'success': ne.util.bind(function(dataObj) {
                try {
                    keyDatas = this._getCollectionData(dataObj);
                    this.autoCompleteObj.setQuerys(dataObj.query);
                    this.autoCompleteObj.setServerData(keyDatas);
                    this.autoCompleteObj.clearReadyValue();
                } catch (e) {
                    throw new Error('[DataManager] Request faild.' , e);
                }
            }, this)
        });
    },
    /**
     * Make collection data to display
     * @param {object} dataObj Collection data
     * @returns {Array}
     * @private
     */
    _getCollectionData: function(dataObj) {
        var collection = dataObj.collections,
            itemDataList = [];

        ne.util.forEach(collection, function(itemSet) {

            if(ne.util.isEmpty(itemSet.items)) {
                return;
            }
            // create collection items.
            var keys = this._getRedirectData(itemSet);

            itemDataList.push({
                type: 'title',
                values: [itemSet.title]
            });
            itemDataList = itemDataList.concat(keys);

        }, this);

        return itemDataList;
    },
    /**
     * Make item of collection to display
     * @param {object} itemSet Item of collection data
     * @private
     * @returns {Array}
     */
    _getRedirectData: function(itemSet) {
        var type = itemSet.type,
            index = itemSet.index,
            dest = itemSet.destination,
            items = [];

        ne.util.forEachArray(itemSet.items, function(item, idx) {

            if (idx <= (this.options.viewCount - 1)) {
                items.push({
                    values: item,
                    type: type,
                    index: index,
                    dest: dest
                });
            }

        }, this);

        return items;
    }
});

module.exports = DataManager;

},{}],4:[function(require,module,exports){
/**
 * @fileOverview InputManager support input element events and all of input function
 * @version 1.1.0
 * @author NHN Entertainment FE dev team. Jein Yi<jein.yi@nhnent.com>
 */

/**
 * Unit of auto complete component that belong with input element.
 * @constructor
 */
var InputManager = ne.util.defineClass(/**@lends InputManager.prototype */{

    /**
     * keyboard Input KeyCode enum
     */
    keyCodeMap: {
        'TAB' : 9,
        'UP_ARROW' : 38,
        'DOWN_ARROW' : 40
    },

    /**
     * Initialize
     * @param {Object} autoCompleteObj AutoComplete instance
     * @param {object} options auto complete options
     */
    init: function(autoCompleteObj, options) {
        if (arguments.length != 2) {
            alert('argument length error !');
            return;
        }
        this.autoCompleteObj = autoCompleteObj;
        this.options = options;

        // Save elements from configuration.
        this.$searchBox = this.options.searchBoxElement;
        this.$toggleBtn = this.options.toggleBtnElement;
        this.$orgQuery = this.options.orgQueryElement;
        this.$formElement = this.options.formElement;

        this.inputValue = this.$searchBox.val();

        this._attachEvent();
    },


    /**
     * Return input element value
     * @return {String}
     */
    getValue: function() {
        return this.$searchBox.val();
    },

    /**
     * Set keyword to input element
     * @param {String} str The keyword to set value.
     */
    setValue: function(str) {
        this.inputValue = str;
        this.$searchBox.val(str);
    },

    /**
     * Read config files parameter option and set parameter.
     * @param {array} options The parameters from config
     * @param {number} index The index for setting key value
     */
    setParams: function(options, index) {

        var opt = this.options,
            listConfig = opt.listConfig[index],
            statics = opt.staticParams[listConfig.staticParams];

        if (options && ne.util.isString(options)) {
            options = options.split(',');
        }

        if ((!options || ne.util.isEmpty(options)) && !ne.util.isExisty(statics)) {
            return;
        }

        this._createParamSetByType(options, index);
    },

    /**
     * Create inputElement by type
     * @param {object} options The values to send search api
     * @param {number} index The index of query key array
     * @private
     */
    _createParamSetByType: function(options, index) {

        var key,
            opt = this.options,
            listConfig = opt.listConfig[index],
            config = opt.subQuerySet[listConfig.subQuerySet],
            statics = opt.staticParams[listConfig.staticParams];

        if (!this.hiddens) {
            this._createParamContainer();
        }

        ne.util.forEach(options, function(value, idx) {

            key = config[idx];
            this.hiddens.append($('<input type="hidden" name="' + key + '" value="' + value + '" />'));

        }, this);

        if (statics) {
            this._createStaticParams(statics);
        }

    },
    /**
     * Create static parameters
     * @param {string} statics Static values
     * @private
     */
    _createStaticParams: function(statics) {
        statics = statics.split(',');
        ne.util.forEach(statics, function(value) {
            val = value.split("=");
            this.hiddens.append($('<input type="hidden" name="' + val[0] + '" value="' + val[1] + '" />'));

        }, this);
    },

    /**
     * Create wrapper that become container of hidden elements.
     * @private
     */
    _createParamContainer: function() {
        this.hiddens = $('<div class="hidden-inputs"></div>');
        this.hiddens.hide();
        this.hiddens.appendTo($(this.$formElement));
    },

    /**
     * Change toggle button image.
     * @param {Boolean} isUse 자동완성 사용 여부
     */
    setToggleBtnImg: function(isUse) {
        if (!this.options.toggleImg || !(this.$toggleBtn)) {
            return;
        }

        if (isUse) {
            this.$toggleBtn.attr('src', this.options.toggleImg.on);
        } else {
            this.$toggleBtn.attr('src', this.options.toggleImg.off);
        }
    },

    /**************************** Private Functions **************************/
    /**
     * Event binding
     * @private
     */
    _attachEvent: function() {
        //검색창에 focus, keyup, keydown, click 이벤트 바인딩.
        this.$searchBox.bind('focus keyup keydown blur click', $.proxy(function(e) {
            switch (e.type) {
                case 'focus' :
                    this._onFocus();
                    break;
                case 'blur' :
                    this._onBlur(e);
                    break;
                case 'keyup' :
                    this._onKeyUp(e);
                    break;
                case 'keydown' :
                    this._onKeyDown(e);
                    break;
                case 'click' :
                    this._onClick();
                    break;
                default :
                    break;
            }
        }, this));

        if (this.$toggleBtn) {
            this.$toggleBtn.bind('click', $.proxy(function(e) {
                this._onClickToggle();
            }, this));
        }
    },

    /**
     * Save user query into hidden element.
     * @param {String} str The string typed by user
     * @private
     */
    _setOrgQuery: function(str) {
        this.$orgQuery.val(str);
    },

    /**************************** Event Handlers *****************************/
    /**
     * Input element onclick event handler
     * @private
     */
    _onClick: function() {
        //입력된 키워드가 없거나 자동완성 기능 사용하지 않으면 펼칠 필요 없으므로 그냥 리턴하고 끝.
        if (!this.autoCompleteObj.getValue() ||
            !this.autoCompleteObj.isUseAutoComplete()) {
            return false;
        }

        if (this.autoCompleteObj.isShowResultList()) {
            //결과 리스트 영역이 show 상태이면(isResultShowing==true) 결과 리스트 hide 요청
            this.autoCompleteObj.hideResultList();
        } else {
            //결과 리스트 영역이 hide 상태이면(isResultShowing==false) 결과 리스트 show 요청
            this.autoCompleteObj.showResultList();
        }
    },

    /**
     * Input element focus event handler
     * @private
     */
    _onFocus: function() {
        //setInterval 설정해서 일정 시간 주기로 _onWatch 함수를 실행한다.
        this.intervalId = setInterval($.proxy(function() {
            this._onWatch();
        }, this), this.options.watchInterval);
    },

    /**
     * Roop for check update input element
     * @private
     */
    _onWatch: function() {
        if (this.$searchBox.val() === '') {
            this._setOrgQuery('');
            this.autoCompleteObj.setMoved(false);
        }

        if (this.inputValue !== this.$searchBox.val()) {
            this.inputValue = this.$searchBox.val();
            this._onChange();
        } else if (!this.autoCompleteObj.getMoved()) {
            this._setOrgQuery(this.$searchBox.val());
        }
    },

    /**
     * Input element keyup event handler
     * @private
     */
    _onKeyUp: function() {
        if (this.inputValue !== this.$searchBox.val()) {
            this.inputValue = this.$searchBox.val();
            this._onChange();
        }
    },

    /**
     * Input element onchange event handler
     * @private
     */
    _onChange: function() {
        if (!this.autoCompleteObj.isUseAutoComplete()) {
            return;
        }

        if (this.autoCompleteObj.isIdle) {
            this.autoCompleteObj.isIdle = false;
            this.autoCompleteObj.request(this.$searchBox.val());
        } else {
            this.autoCompleteObj.readyValue = this.$searchBox.val();
        }
    },

    /**
     * Input element blur event handler
     * @private
     */
    _onBlur: function() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    /**
     * Input element keydown event handler
     * Set actino by input value
     * @param {Event} e keyDown Event instance
     * @private
     */
    _onKeyDown: function(e) {
        var autoCompleteObj = this.autoCompleteObj;

        if (!autoCompleteObj.isUseAutoComplete() ||
            !autoCompleteObj.isShowResultList()) {
            return;
        }

        var code = e.keyCode,
            flow = null,
            codeMap = this.keyCodeMap,
            flowMap = autoCompleteObj.flowMap;

        if (code === codeMap.TAB) {
            e.preventDefault();
            flow = e.shiftKey ? flowMap.NEXT : flowMap.PREV;
        } else if (code === codeMap.DOWN_ARROW) {
            flow = flowMap.NEXT;
        } else if (code === codeMap.UP_ARROW) {
            flow = flowMap.PREV;
        } else {
            return;
        }

        autoCompleteObj.moveNextList(flow);

    },

    /**
     * Toggle button click event handler
     * @private
     */
    _onClickToggle: function() {
        if (!this.autoCompleteObj.isUseAutoComplete()) {
            this.setToggleBtnImg(true);
            this.autoCompleteObj.setCookieValue(true);
            this.autoCompleteObj.changeOnOffText(false);
        } else {
            this.autoCompleteObj.hideResultList();
            this.setToggleBtnImg(false);
            this.autoCompleteObj.setCookieValue(false);
            this.autoCompleteObj.changeOnOffText(true);
        }
    }
});

module.exports = InputManager;

},{}],5:[function(require,module,exports){
/**
 * @fileoverview ResultManager draw result list and apply template.
 * @version 1.1.0
 * @author  NHN entertainment FE dev team Jein Yi<jein.yi@nhnent.com>
 */

/**
 * Unit of auto complete that belong with search result list.
 * @constructor
 */
var ResultManager = ne.util.defineClass(/** @lends ResultManager.prototype */{
    /**
     * Initailize
     */
    init: function(autoCompleteObj, options) {
        this.autoCompleteObj = autoCompleteObj;
        this.options = options;

        this.$resultList = this.options.resultListElement;
        this.resultSelector = this.options.resultListElement;
        this.viewCount = this.options.viewCount || 10;
        this.$onOffTxt = this.options.onoffTextElement;
        this.mouseOverClass = this.options.mouseOverClass;
        this.flowMap = this.autoCompleteObj.flowMap;

        this._attachEvent();

        this.selectedElement = null;

        this.isMoved = false;
    },

    /**
     * Delete last result list
     * @private
     */
    _deleteBeforeElement: function() {
        this.$resultList.html('');
        this.$resultList.hide();
        this.selectedElement = null;
    },

    /**
     * Draw result form api server
     * @param {Array} dataArr Result data
     */
    draw: function(dataArr) {

        this._deleteBeforeElement();

        var len = dataArr.length;

        if (len < 1) {
            this._hideBottomArea();
        } else {
            this._makeResultList(dataArr, len);
        }

        this.$resultList.show();
        // show auto complete switch
        this._showBottomArea();
    },

    /**
     * Make search result list element
     * @private
     */
    _makeResultList: function(dataArr, len) {
        var template = this.options.template,
            config = this.options.listConfig,
            tmpl,
            useTitle = (this.options.useTitle && !!template.title),
            index,
            type,
            tmplValue,
            $el,
            i;

        for (i = 0; i < len; i++) {
            type = dataArr[i].type;
            index = dataArr[i].index;
            tmpl = config[index] ? template[config[index].template] : template.defaults;
            if (type === 'title') {
                tmpl = template.title;
                if (!useTitle) {
                    continue;
                }
            }
            tmplValue = this._getTmplData(tmpl.attr, dataArr[i]);
            $el = $(this._applyTemplate(tmpl.element, tmplValue));
            $el.attr('data-params', tmplValue.params);
            $el.attr('data-index', index);
            this.$resultList.append($el);
        }
    },

    /**
     * Make template data
     * @param {array} attrs Template attributes
     * @param {string|Object} data The data to make template
     * @return {object}
     * @private
     */
    _getTmplData: function(attrs, data) {
        var tmplValue = {},
            values = data.values || null;

        if (ne.util.isString(data)) {
            tmplValue[attrs[0]] = data;
            return tmplValue;
        }
        ne.util.forEach(attrs, function(attr, idx) {

            tmplValue[attr] = values[idx];

        });

        if(attrs.length < values.length) {
            tmplValue.params = values.slice(attrs.length);
        }

        return tmplValue;
    },

    /**
     * Return whether result list show or not
     * @return {Boolean}
     */
    isShowResultList: function() {
        return (this.$resultList.css('display') === 'block');
    },

    /**
     * Hide result list area
     */
    hideResultList: function() {
        this.$resultList.css('display', 'none');
        this._hideBottomArea();
        this.autoCompleteObj.isIdle = true;
        this.autoCompleteObj.fire('close');
    },

    /**
     * Show result list area
     */
    showResultList: function() {
        var self = this;
        setTimeout(function() {
            self.$resultList.css('display', 'block');
        }, 0);

        this._showBottomArea();
    },

    /**
     * Move focus to next item, change input element value as focus value.
     * @param {string} flow Direction by key code
     */
    moveNextList: function(flow) {
        var flowMap = this.flowMap,
            selectEl = this.selectedElement,
            getNext = (flow === flowMap.NEXT) ? this._getNext : this._getPrev,
            getBound = (flow === flowMap.NEXT) ? this._getFirst : this._getLast,
            keyword;
        this.isMoved = true;

        if (selectEl) {
            selectEl.removeClass(this.mouseOverClass);
            selectEl = this.selectedElement = getNext.call(this, selectEl);
        } else {
            selectEl = this.selectedElement = getBound.call(this);
        }

        keyword = selectEl.find('.keyword-field').text();

        if (selectEl && keyword) {
            selectEl.addClass(this.mouseOverClass);
            this.autoCompleteObj.setValue(keyword);
            this._setSubmitOption();
        } else {
            if(selectEl) {
                this.moveNextList(flow);
            }
        }
    },

    /**
     * Chage text by whether auto complete use or not
     * @param {Boolean} isUse on/off 여부
     */
    changeOnOffText: function(isUse) {
        if (isUse) {
            this.$onOffTxt.text('자동완성 켜기');
            this.hideResultList();
        } else {
            this.$onOffTxt.text('자동완성 끄기');
        }
    },


    /**
     * Attach auto complete event belongs with result list
     * @private
     */
    _attachEvent: function() {
        this.$resultList.bind('mouseover click', $.proxy(function(e) {
            if (e.type === 'mouseover') {
                this._onMouseOver(e);
            } else if (e.type === 'click') {
                this._onClick(e);
            }
        }, this));

        if (this.$onOffTxt) {
            this.$onOffTxt.bind('click', $.proxy(function() {
                this._useAutoComplete();
            }, this));
        }

        $(document).bind('click', $.proxy(function(e) {
            if (e.target.tagName.toLowerCase() !== 'html') {
                return;
            }
            this.hideResultList();
        }, this));
    },


    /**
     * Highlight key word
     * @param {String} tmplStr Template string
     * @param {Object} dataObj Replace string map
     * @return {String}
     * @private
     */
    _applyTemplate: function(tmplStr, dataObj) {
        var temp = {},
            keyStr;

        for (keyStr in dataObj) {
            temp[keyStr] = dataObj[keyStr];
            if (keyStr === 'subject') {
                temp.subject = this._highlight(dataObj.subject);
            }

            if (!dataObj.propertyIsEnumerable(keyStr)) {
                continue;
            }

            tmplStr = tmplStr.replace(new RegExp("@" + keyStr + "@", "g"), temp[keyStr]);
        }
        return tmplStr;
    },

    /**
     * Return applied highlight effect key word
     * (text: Nike air  /  query : [Nike] / Result : <strong>Nike </strong>air
     * text : 'rhdiddl와 고양이' / query :  [rhdiddl, 고양이] / 리턴결과 <strong>rhdiddl</strong>와 <strong>고양이</strong>
     * @param {String} text Input string
     * @return {String}
     * @private
     */
    _highlight: function(text) {
        var querys = this.autoCompleteObj.querys,
            returnStr;

        ne.util.forEach(querys, function(query) {

            if (!returnStr) {
                returnStr = text;
            }
            returnStr = this._makeStrong(returnStr, query);

        }, this);
        return (returnStr || text);
    },

    /**
     * Contain text by strong tag
     * @param {String} text Recommend search data  추천검색어 데이터
     * @param {String} query Input keyword
     * @return {String}
     * @private
     */
    _makeStrong: function(text, query) {
        if (!query || query.length < 1) {
            return text;
        }
        var escRegExp = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"),
            tmpStr = query.replace(/()/g, " ").replace(/^\s+|\s+$/g, ""),
            tmpCharacters = tmpStr.match(/\S/g),
            tmpCharLen = tmpCharacters.length,
            tmpArr = [],
            returnStr = '',
            regQuery,
            cnt,
            i;

        for (i = 0, cnt = tmpCharLen; i < cnt; i++) {
            tmpArr.push(tmpCharacters[i].replace(/[\S]+/g, "[" + tmpCharacters[i].toLowerCase().replace(escRegExp, "\\$&") + "|" + tmpCharacters[i].toUpperCase().replace(escRegExp, "\\$&") + "] ").replace(/[\s]+/g, "[\\s]*"));
        }

        tmpStr = "(" + tmpArr.join("") + ")";
        regQuery = new RegExp(tmpStr);

        if (regQuery.test(text)) {
            returnStr = text.replace(regQuery, '<strong>' + RegExp.$1 + '</strong>');
        }

        return returnStr;
    },

    /**
     * Return the first result item
     * @return {Element}
     * @private
     */
    _getFirst: function() {
        return this._orderStage(this.flowMap.FIRST);
    },

    /**
     * Return the last result item
     * @return {Element}
     * @private
     */
    _getLast: function() {
        return this._orderStage(this.flowMap.LAST);
    },

    /**
     * Return whether first or last
     * @param {string} type First/end element type
     * @returns {*}
     * @private
     */
    _orderStage: function(type) {
        type = (type === this.flowMap.FIRST) ? 'first' : 'last';

        if (this.$resultList &&
            this.$resultList.children() &&
            this.$resultList.children().length) {
            return this.$resultList.children()[type]();
        }
        return null;
    },

    /**
     * Return next element from selected element
     * If next element is not exist, return first element.
     * @param {Element} element focused element
     * @return {Element}
     * @private
     */
    _getNext: function(element) {
        return this._orderElement(this.flowMap.NEXT, element);
    },

    /**
     * Return previous element from selected element
     * If previous element is not exist, return the last element.
     * @param {Element} element focused element
     * @return {Element}
     * @private
     */
    _getPrev: function(element) {
        return this._orderElement(this.flowMap.PREV, element);
    },

    /**
     * Return previous or next element by direction.
     * @param {string} type The direction type for finding element
     * @param {Element} element focused element
     * @returns {*}
     * @private
     */
    _orderElement: function(type, element) {
        if (!ne.util.isExisty(element)) {
            return null;
        }

        var $current = $(element),
            isNext = (type === this.flowMap.NEXT),
            order;

        if ($current.closest(this.resultSelector)) {
            order = isNext ? element.next() : element.prev();
            if (order.length) {
                return order;
            } else {
                return isNext ? this._getFirst() : this._getLast();
            }
        }
    },

    /**
     * Set whether auto complete use or not and change switch's state.
     * @private
     */
    _useAutoComplete: function() {
        var isUse = this.autoCompleteObj.isUseAutoComplete();
        this.changeOnOffText(isUse);
        this.autoCompleteObj.setCookieValue(!isUse);
    },

    /**
     * Show auto complete switch area
     * @private
     */
    _showBottomArea: function() {
        if (this.$onOffTxt) {
            this.$onOffTxt.show();
        }
    },

    /**
     * Hide auto complete switch area
     * @private
     */
    _hideBottomArea: function() {
        if (this.$onOffTxt) {
            this.$onOffTxt.hide();
        }
    },

    /**
     * Change action attribute of form element and set addition values in hidden type elements.
     * @param {element} [$target] Submit options target
     * @private
     */
    _setSubmitOption: function($target) {
        this._clearSubmitOption();

        var formElement = this.options.formElement,
            $selectField = $target ? $($target).closest('li') : $(this.selectedElement),
            actions = this.options.actions,
            index = $selectField.attr('data-index'),
            config = this.options.listConfig[index],
            action = actions[config.action],
            paramsString;

        $(formElement).attr('action', action);
        paramsString = $selectField.attr('data-params');

        this.autoCompleteObj.setParams(paramsString, index);

        this.autoCompleteObj.fire('change', {
            index: index,
            action: action,
            params: paramsString
        });
    },

    /**
     * Reset form element.
     * @private
     */
    _clearSubmitOption: function(e) {
        var formElement = this.options.formElement,
            hiddenWrap = $(formElement).find('.hidden-inputs');

        hiddenWrap.html('');
    },

    /************************* Event Handlers *********************/
    /**
     * Result list mouseover event handler
     * @param {Event} e Event instanse
     * @private
     */
    _onMouseOver: function(e) {
        var $target = $(e.target),
            $arr = this.$resultList.find('li'),
            selectedItem = $target.closest('li');

        ne.util.forEachArray($arr, function(val) {
            $(val).removeClass(this.mouseOverClass);
        }, this);

        if (selectedItem && selectedItem.find('.keyword-field').length) {
            selectedItem.addClass(this.mouseOverClass);
        }

        this.selectedElement = $target;
    },

    /**
     * Result list click evnet handler
     * Submit form element.
     * @param {Event} e Event instanse
     * @private
     */
    _onClick: function(e) {
        var $target = $(e.target),
            formElement = this.options.formElement,
            $selectField = $target.closest('li'),
            $keywordField = $selectField.find('.keyword-field'),
            selectedKeyword = $keywordField.text();

        this.autoCompleteObj.setValue(selectedKeyword);

        if (formElement && selectedKeyword) {
            this._setSubmitOption($target);
            formElement.submit();
        }
    }
});

module.exports = ResultManager;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9qcy9BdXRvQ29tcGxldGUuanMiLCJzcmMvanMvRGF0YU1hbmFnZXIuanMiLCJzcmMvanMvSW5wdXRNYW5hZ2VyLmpzIiwic3JjL2pzL1Jlc3VsdE1hbmFnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzViQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJuZS51dGlsLmRlZmluZU5hbWVzcGFjZSgnbmUuY29tcG9uZW50LkF1dG9Db21wbGV0ZScsIHJlcXVpcmUoJy4vc3JjL2pzL0F1dG9Db21wbGV0ZScpKTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBDb3JlIGVsZW1lbnQuIEFsbCBvZiBhdXRvIGNvbXBsZXRlIG9iamVjdHMgYmVsb25nIHdpdGggdGhpcyBvYmplY3QuXG4gKiBAdmVyc2lvbiAxLjEuMFxuICogQGF1dGhvciBOSE4gRW50ZXJ0YWlubWVudCBGRSBEZXYgVGVhbS4gSmVpbiBZaTxqZWluLnlpQG5obmVudC5jb20+XG4qL1xuXG52YXIgRGF0YU1hbmFnZXIgPSByZXF1aXJlKCcuL0RhdGFNYW5hZ2VyJyk7XG52YXIgSW5wdXRNYW5hZ2VyID0gcmVxdWlyZSgnLi9JbnB1dE1hbmFnZXInKTtcbnZhciBSZXN1bHRNYW5hZ2VyID0gcmVxdWlyZSgnLi9SZXN1bHRNYW5hZ2VyJyk7XG5cbi8qKlxuIEBjb25zdHJ1Y3RvclxuIEBwYXJhbSB7T2JqZWN0fSBodE9wdGlvbnNcbiBAZXhhbXBsZVxuICAgIHZhciBhdXRvQ29tcGxldGVPYmogPSBuZXcgbmUuY29tcG9uZW50LkF1dG9Db21wbGV0ZSh7XG4gICAgICAgXCJjb25maWdJZFwiIDogXCJEZWZhdWx0XCIgICAgLy8gRGF0YXNldCBpbiBhdXRvQ29uZmlnLmpzXG4gICAgfSk7XG4gICAgLyoqXG4gICAgVGhlIGZvcm0gb2YgY29uZmlnIGZpbGUgXCJhdXRvQ29uZmlnLmpzXCJcbiAgICB7XG4gICAgICAgIERlZmF1bHQgPSB7XG4gICAgICAgIC8vIFJlc3VsdCBlbGVtZW50XG4gICAgICAgICdyZXN1bHRMaXN0RWxlbWVudCc6ICcuX3Jlc3VsdEJveCcsXG5cbiAgICAgICAgLy8gSW5wdXQgZWxlbWVudFxuICAgICAgICAnc2VhcmNoQm94RWxlbWVudCc6ICAnI2FjX2lucHV0MScsXG5cbiAgICAgICAgLy8gSGlkZGVuIGVsZW1lbnQgdGhhdCBpcyBmb3IgdGhyb3dpbmcgcXVlcnkgdGhhdCB1c2VyIHR5cGUuXG4gICAgICAgICdvcmdRdWVyeUVsZW1lbnQnIDogJyNvcmdfcXVlcnknLFxuXG4gICAgICAgIC8vIG9uLG9mZiBCdXR0b24gZWxlbWVudFxuICAgICAgICAndG9nZ2xlQnRuRWxlbWVudCcgOiAkKFwiI29ub2ZmQnRuXCIpLFxuXG4gICAgICAgIC8vIG9uLG9mZiBTdGF0ZSBlbGVtZW50XG4gICAgICAgICdvbm9mZlRleHRFbGVtZW50JyA6ICQoXCIuYmFzZUJveCAuYm90dG9tXCIpLFxuXG4gICAgICAgIC8vIG9uLCBvZmYgU3RhdGUgaW1hZ2Ugc291cmNlXG4gICAgICAgICd0b2dnbGVJbWcnIDoge1xuICAgICAgICAgICAgJ29uJyA6ICcuLi9pbWcvYnRuX29uLmpwZycsXG4gICAgICAgICAgICAnb2ZmJyA6ICcuLi9pbWcvYnRuX29mZi5qcGcnXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gQ29sbGVjdGlvbiBpdGVtcyBlYWNoIGNvdW50LlxuICAgICAgICAndmlld0NvdW50JyA6IDMsXG5cbiAgICAgICAgLy8gS2V5IGFycmF5cyAoc3ViIHF1ZXJ5IGtleXMnIGFycmF5KVxuICAgICAgICAnc3ViUXVlcnlTZXQnOiBbXG4gICAgICAgICAgICBbJ2tleTEnLCAna2V5MicsICdrZXkzJ10sXG4gICAgICAgICAgICBbJ2RlcDEnLCAnZGVwMicsICdkZXAzJ10sXG4gICAgICAgICAgICBbJ2NoMScsICdjaDInLCAnY2gzJ10sXG4gICAgICAgICAgICBbJ2NpZCddXG4gICAgICAgIF0sXG5cbiAgICAgICAgLy8gQ29uZmlnIGZvciBhdXRvIGNvbXBsZXRlIGxpc3QgYnkgaW5kZXggb2YgY29sbGVjdGlvblxuICAgICAgICAnbGlzdENvbmZpZyc6IHtcbiAgICAgICAgICAgICcwJzoge1xuICAgICAgICAgICAgICAgICd0ZW1wbGF0ZSc6ICdkZXBhcnRtZW50JyxcbiAgICAgICAgICAgICAgICAnc3ViUXVlcnlTZXQnIDogMCxcbiAgICAgICAgICAgICAgICAnYWN0aW9uJzogMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICcxJzoge1xuICAgICAgICAgICAgICAgICd0ZW1wbGF0ZSc6ICdzcmNoX2luX2RlcGFydG1lbnQnLFxuICAgICAgICAgICAgICAgICdzdWJRdWVyeVNldCcgOiAxLFxuICAgICAgICAgICAgICAgICdhY3Rpb24nOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJzInOiB7XG4gICAgICAgICAgICAgICAgJ3RlbXBsYXRlJzogJ3NyY2hfaW5fZGVwYXJ0bWVudCcsXG4gICAgICAgICAgICAgICAgJ3N1YlF1ZXJ5U2V0JyA6IDIsXG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6IDEsXG4gICAgICAgICAgICAgICAgJ3N0YXRpY1BhcmFtcyc6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAnMyc6IHtcbiAgICAgICAgICAgICAgICAndGVtcGxhdGUnOiAnZGVwYXJ0bWVudCcsXG4gICAgICAgICAgICAgICAgJ3N1YlF1ZXJ5U2V0JyA6IDAsXG4gICAgICAgICAgICAgICAgJ2FjdGlvbic6IDEsXG4gICAgICAgICAgICAgICAgJ3N0YXRpY1BhcmFtcyc6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAgLy8gTWFyayB1cCBmb3IgZWFjaCBjb2xsZWN0aW9uLiAoRGVmYXVsdCBtYXJrdXAgaXMgZGVmYXVsdHMuKVxuICAgICAgICAgLy8gVGhpcyBtYXJrdXAgaGFzIHRvIGhhdmUgXCJrZXl3b2xkLWZpZWxkXCIgYnV0IHRpdGxlLlxuICAgICAgICAgJ3RlbXBsYXRlJyA6ICB7XG4gICAgICAgICAgICAgICAgZGVwYXJ0bWVudDogICAge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiAnPGxpIGNsYXNzPVwiZGVwYXJ0bWVudFwiPicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJzbG90LWZpZWxkXCI+U2hvcCB0aGU8L3NwYW4+ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGEgaHJlZj1cIiNcIiBjbGFzcz1cImtleXdvcmQtZmllbGRcIj5Ac3ViamVjdEA8L2E+ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJzbG90LWZpZWxkXCI+U3RvcmU8L3NwYW4+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8L2xpPicsXG4gICAgICAgICAgICAgICAgICAgICBhdHRyOiBbJ3N1YmplY3QnXVxuICAgICAgICAgfSxcbiAgICAgICAgIHNyY2ggOiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICc8bGkgY2xhc3M9XCJzcmNoXCI+PHNwYW4gY2xhc3M9XCJrZXl3b3JkLWZpZWxkXCI+QHN1YmplY3RAPC9zcGFuPjwvbGk+JyxcbiAgICAgICAgICAgICAgICAgICAgYXR0cjogWydzdWJqZWN0J11cbiAgICAgICAgIH0sXG4gICAgICAgICBzcmNoX2luX2RlcGFydG1lbnQgOiAgICB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICc8bGkgY2xhc3M9XCJpbkRlcGFydG1lbnRcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxhIGhyZWY9XCIjXCIgY2xhc3M9XCJrZXl3b3JkLWZpZWxkXCI+QHN1YmplY3RAPC9hPiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8c3BhbiBjbGFzcz1cInNsb3QtZmllbGRcIj5pbiA8L3NwYW4+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPHNwYW4gY2xhc3M9XCJkZXBhcnQtZmllbGRcIj5AZGVwYXJ0bWVudEA8L3NwYW4+JyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICc8L2xpPicsXG4gICAgICAgICAgICAgICAgICAgICBhdHRyOiBbJ3N1YmplY3QnLCAnZGVwYXJ0bWVudCddXG4gICAgICAgICB9LFxuICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogJzxsaSBjbGFzcz1cInRpdGxlXCI+PHNwYW4+QHRpdGxlQDwvc3Bhbj48L2xpPicsXG4gICAgICAgICAgICAgICAgICAgIGF0dHI6IFsndGl0bGUnXVxuICAgICAgICAgfSxcbiAgICAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6ICc8bGkgY2xhc3M9XCJzcmNoXCI+PHNwYW4gY2xhc3M9XCJrZXl3b3JkLWZpZWxkXCI+QHN1YmplY3RAPC9zcGFuPjwvbGk+JyxcbiAgICAgICAgICAgICAgICAgICAgYXR0cjogWydzdWJqZWN0J11cbiAgICAgICAgIH1cbiAgICAgICAgIH0sXG5cbiAgICAgICAgIC8vIEFjdGlvbiBhdHRyaWJ1dGUgZm9yIGVhY2ggY29sbGVjdGlvblxuICAgICAgICAgJ2FjdGlvbnMnOiBbXG4gICAgICAgICAgICAgXCJodHRwOi8vd3d3LmZhc2hpb25nby5uZXQvY2F0YWxvZy5hc3B4XCIsXG4gICAgICAgICAgICAgXCJodHRwOi8vd3d3LmZhc2hpb25nby5uZXQvc2VhcmNoMi5hc3B4XCJcbiAgICAgICAgIF0sXG5cbiAgICAgICAgIC8vIFNldCBzdGF0aWMgb3B0aW9ucyBmb3IgZWFjaCBjb2xsZWN0aW9uLlxuICAgICAgICAgJ3N0YXRpY1BhcmFtcyc6W1xuICAgICAgICAgICAgIFwicXQ9UHJvZHVjdE5hbWVcIixcbiAgICAgICAgICAgICBcImF0PVRFU1QsYnQ9QUNUXCJcbiAgICAgICAgIF0sXG5cbiAgICAgICAgIC8vIFdoZXRoZXIgdXNlIHRpdGxlIG9yIG5vdC5cbiAgICAgICAgICd1c2VUaXRsZSc6IHRydWUsXG5cbiAgICAgICAgIC8vIEZvcm0gZWxlbWVudCB0aGF0IGluY2x1ZGUgc2VhcmNoIGVsZW1lbnRcbiAgICAgICAgICdmb3JtRWxlbWVudCcgOiAnI2FjX2Zvcm0xJyxcblxuICAgICAgICAgLy8gQ29va2llIG5hbWUgZm9yIHNhdmUgc3RhdGVcbiAgICAgICAgICdjb29raWVOYW1lJyA6IFwidXNlY29va2llXCIsXG5cbiAgICAgICAgIC8vIENsYXNzIG5hbWUgZm9yIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgICAgICdtb3VzZU92ZXJDbGFzcycgOiAnZW1wJyxcblxuICAgICAgICAgLy8gQXV0byBjb21wbGV0ZSBBUElcbiAgICAgICAgICdzZWFyY2hVcmwnIDogJ2h0dHA6Ly8xMC4yNC4xMzYuMTcyOjIwMDExL2FjJyxcblxuICAgICAgICAgLy8gQXV0byBjb21wbGV0ZSBBUEkgcmVxdWVzdCBjb25maWdcbiAgICAgICAgICdzZWFyY2hBcGknIDoge1xuICAgICAgICAgICAgICAgICdzdCcgOiAxMTExLFxuICAgICAgICAgICAgICAgICdyX2x0JyA6IDExMTEsXG4gICAgICAgICAgICAgICAgJ3JfZW5jJyA6ICdVVEYtOCcsXG4gICAgICAgICAgICAgICAgJ3FfZW5jJyA6ICdVVEYtOCcsXG4gICAgICAgICAgICAgICAgJ3JfZm9ybWF0JyA6ICdqc29uJ1xuICAgICAgICAgICAgfVxuICAgICAgIH1cbiAgICB9XG5cbiovXG52YXIgQXV0b0NvbXBsZXRlID0gbmUudXRpbC5kZWZpbmVDbGFzcygvKipAbGVuZHMgbmUuY29tcG9uZW50LkF1dG9Db21wbGV0ZS5wcm90b3R5cGUgKi97XG5cbiAgICAvKipcbiAgICAgKiBEaXJlY3Rpb24gdmFsdWUgZm9yIGtleVxuICAgICAqL1xuICAgIGZsb3dNYXA6IHtcbiAgICAgICAgJ05FWFQnOiAnbmV4dCcsXG4gICAgICAgICdQUkVWJzogJ3ByZXYnLFxuICAgICAgICAnRklSU1QnOiAnZmlyc3QnLFxuICAgICAgICAnTEFTVCc6ICdsYXN0J1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW50ZXJ2YWwgZm9yIGNoZWNrIHVwZGF0ZSBpbnB1dFxuICAgICAqL1xuICAgIHdhdGNoSW50ZXJ2YWw6IDIwMCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaHRPcHRpb25zIGF1dG9jb25maWcgdmFsdWVzXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24oaHRPcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHt9O1xuXG4gICAgICAgIGlmICghdGhpcy5fY2hlY2tWYWxpZGF0aW9uKGh0T3B0aW9ucykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb29raWVWYWx1ZSxcbiAgICAgICAgICAgIGRlZmF1bHRDb29raWVOYW1lID0gJ19hdGNwX3VzZV9jb29raWUnO1xuXG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnRvZ2dsZUltZyB8fCAhdGhpcy5vcHRpb25zLm9ub2ZmVGV4dEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRoaXMuaXNVc2UgPSB0cnVlO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMub3B0aW9ucy5vbm9mZlRleHRFbGVtZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29va2llVmFsdWUgPSAkLmNvb2tpZSh0aGlzLm9wdGlvbnMuY29va2llTmFtZSk7XG4gICAgICAgICAgICB0aGlzLmlzVXNlID0gISEoY29va2llVmFsdWUgPT09ICd1c2UnIHx8ICFjb29raWVWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5jb29raWVOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuY29va2llTmFtZSA9IGRlZmF1bHRDb29raWVOYW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLndhdGNoSW50ZXJ2YWwgPSBuZS51dGlsLmlzRXhpc3R5KHRoaXMub3B0aW9ucy53YXRjaEludGVydmFsKSA/IHRoaXMub3B0aW9ucy53YXRjaEludGVydmFsIDogdGhpcy53YXRjaEludGVydmFsO1xuXG4gICAgICAgIHRoaXMuZGF0YU1hbmFnZXIgPSBuZXcgRGF0YU1hbmFnZXIodGhpcywgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgdGhpcy5pbnB1dE1hbmFnZXIgPSBuZXcgSW5wdXRNYW5hZ2VyKHRoaXMsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMucmVzdWx0TWFuYWdlciA9IG5ldyBSZXN1bHRNYW5hZ2VyKHRoaXMsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNhdmUgbWF0Y2hlZCBpbnB1dCBlbmdsaXNoIHN0cmluZyB3aXRoIEtvcmVhbi5cbiAgICAgICAgICogQHR5cGUge251bGx9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnF1ZXJ5cyA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNJZGxlID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLnNldFRvZ2dsZUJ0bkltZyh0aGlzLmlzVXNlKTtcbiAgICAgICAgdGhpcy5zZXRDb29raWVWYWx1ZSh0aGlzLmlzVXNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgcmVxdWlyZWQgZmllbGRzIGFuZCB2YWxpZGF0ZSBmaWVsZHMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGh0T3B0aW9ucyBjb21wb25lbnQgY29uZmlndXJhdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NoZWNrVmFsaWRhdGlvbjogZnVuY3Rpb24oaHRPcHRpb25zKSB7XG4gICAgICAgIHZhciBjb25maWcsXG4gICAgICAgICAgICBjb25maWdBcnI7XG5cbiAgICAgICAgY29uZmlnID0gaHRPcHRpb25zLmNvbmZpZztcblxuICAgICAgICBpZiAoIW5lLnV0aWwuaXNFeGlzdHkoY29uZmlnKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25maWcgZmlsZSBpcyBub3QgYXZhbGlhYmxlLiAjJyArIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWdBcnIgPSBuZS51dGlsLmtleXMoY29uZmlnKTtcblxuICAgICAgICB2YXIgY29uZmlnTGVuID0gY29uZmlnQXJyLmxlbmd0aCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICByZXF1aXJlZEZpZWxkcyA9IFtcbiAgICAgICAgICAgICAgICAncmVzdWx0TGlzdEVsZW1lbnQnLFxuICAgICAgICAgICAgICAgICdzZWFyY2hCb3hFbGVtZW50JyAsXG4gICAgICAgICAgICAgICAgJ29yZ1F1ZXJ5RWxlbWVudCcsXG4gICAgICAgICAgICAgICAgJ3N1YlF1ZXJ5U2V0JyxcbiAgICAgICAgICAgICAgICAndGVtcGxhdGUnLFxuICAgICAgICAgICAgICAgICdsaXN0Q29uZmlnJyxcbiAgICAgICAgICAgICAgICAnYWN0aW9ucycsXG4gICAgICAgICAgICAgICAgJ2Zvcm1FbGVtZW50JyxcbiAgICAgICAgICAgICAgICAnc2VhcmNoVXJsJyxcbiAgICAgICAgICAgICAgICAnc2VhcmNoQXBpJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGNoZWNrZWRGaWVsZHMgPSBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29uZmlnTGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChuZS51dGlsLmluQXJyYXkoY29uZmlnQXJyW2ldLCByZXF1aXJlZEZpZWxkcywgMCkgPj0gMCkge1xuICAgICAgICAgICAgICAgIGNoZWNrZWRGaWVsZHMucHVzaChjb25maWdBcnJbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbmUudXRpbC5mb3JFYWNoKHJlcXVpcmVkRmllbGRzLCBmdW5jdGlvbihlbCkge1xuICAgICAgICAgICAgaWYgKG5lLnV0aWwuaW5BcnJheShlbCwgY2hlY2tlZEZpZWxkcywgMCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVsICsgJ2RvZXMgbm90IG5vdCBleGlzdC4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChlbCA9PT0gJ3NlYXJjaEFwaScgJiYgY29uZmlnWydzZWFyY2hBcGknXSkge1xuICAgICAgICAgICAgICAgIGlmICghY29uZmlnLnNlYXJjaFVybCB8fFxuICAgICAgICAgICAgICAgICAgICAhY29uZmlnLnNlYXJjaEFwaS5zdCB8fFxuICAgICAgICAgICAgICAgICAgICAhY29uZmlnLnNlYXJjaEFwaS5yX2x0KSB7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0KCdzZWFyY2hBcGkgcmVxdWlyZWQgdmFsdWUgZG9lcyBub3QgZXhpc3QuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb25maWdMZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNvbmZpZ05hbWUgPSBjb25maWdBcnJbaV0sXG4gICAgICAgICAgICAgICAgY29uZmlnVmFsdWUgPSBjb25maWdbY29uZmlnTmFtZV07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnVmFsdWUgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgICAoY29uZmlnVmFsdWUuY2hhckF0KDApID09PSAnLicgfHwgY29uZmlnVmFsdWUuY2hhckF0KDApID09PSAnIycpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zW2NvbmZpZ05hbWVdID0gJChjb25maWdWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9uc1tjb25maWdOYW1lXSA9IGNvbmZpZ1tjb25maWdOYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGRhdGEgYXQgYXBpIHNlcnZlciB3aXRoIGtleXdvcmRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5d29yZCBUaGUga2V5IHdvcmQgdG8gc2VuZCB0byBBdXRvIGNvbXBsZXRlIEFQSVxuICAgICAqL1xuICAgIHJlcXVlc3Q6IGZ1bmN0aW9uKGtleXdvcmQpIHtcbiAgICAgICAgdGhpcy5kYXRhTWFuYWdlci5yZXF1ZXN0KGtleXdvcmQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gc3RyaW5nIGluIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAqL1xuICAgIGdldFZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5wdXRNYW5hZ2VyLmdldFZhbHVlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBpbnB1dE1hbmFnZXIncyB2YWx1ZSB0byBzaG93IGF0IHNlYXJjaCBlbGVtZW50XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgVGhlIHN0cmluZyB0byBzaG93IHVwIGF0IHNlYXJjaCBlbGVtZW50XG4gICAgICovXG4gICAgc2V0VmFsdWU6IGZ1bmN0aW9uKGtleXdvcmQpIHtcbiAgICAgICAgdGhpcy5pbnB1dE1hbmFnZXIuc2V0VmFsdWUoa2V5d29yZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgdG8gY3JlYXRlIGFkZGl0aW9uIHBhcmFtZXRlcnMgYXQgaW5wdXRNYW5hZ2VyLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbVN0ciBTdHJpbmcgdG8gYmUgYWRkaXRpb24gcGFyYW1ldGVycy4oc2FwZXJhdG9yICcmJylcbiAgICAgKi9cbiAgICBzZXRQYXJhbXM6IGZ1bmN0aW9uKHBhcmFtU3RyLCB0eXBlKSB7XG4gICAgICAgIHRoaXMuaW5wdXRNYW5hZ2VyLnNldFBhcmFtcyhwYXJhbVN0ciwgdHlwZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgdG8gZHJhdyByZXN1bHQgYXQgcmVzdWx0TWFuYWdlciB3aXRoIGRhdGEgZnJvbSBhcGkgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGFBcnIgRGF0YSBhcnJheSBmcm9tIGFwaSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBzZXRTZXJ2ZXJEYXRhOiBmdW5jdGlvbihkYXRhQXJyKSB7XG4gICAgICAgIHRoaXMucmVzdWx0TWFuYWdlci5kcmF3KGRhdGFBcnIpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgQ29va2llIHZhbHVlIHdpdGggd2hldGhlciB1c2UgYXV0byBjb21wbGV0ZSBvciBub3RcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzVXNlIFdoZXRoZXIgdXNlIGF1dG8gY29tcGxldGUgb3Igbm90XG4gICAgICovXG4gICAgc2V0Q29va2llVmFsdWU6IGZ1bmN0aW9uKGlzVXNlKSB7XG4gICAgICAgICQuY29va2llKHRoaXMub3B0aW9ucy5jb29raWVOYW1lLCBpc1VzZSA/ICd1c2UnIDogJ25vdFVzZScpO1xuICAgICAgICB0aGlzLmlzVXNlID0gaXNVc2U7XG4gICAgICAgIHRoaXMuc2V0VG9nZ2xlQnRuSW1nKGlzVXNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSBLb3JlYW4gdGhhdCBpcyBtYXRjaGVkIHJlYWwgcXVlcnkuXG4gICAgICogQHBhcmFtIHthcnJheX0gcXVlcnlzIFJlc3VsdCBxdXJleXNcbiAgICAgKi9cbiAgICBzZXRRdWVyeXM6IGZ1bmN0aW9uKHF1ZXJ5cykge1xuICAgICAgICB0aGlzLnF1ZXJ5cyA9IFtdLmNvbmNhdChxdWVyeXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgd2hldGhlciB1c2UgYXV0byBjb21wbGV0ZSBvciBub3RcbiAgICAgKiAgQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1VzZUF1dG9Db21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzVXNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgd2hldGhlciByZXN1bHQgbGlzdCBhcmVhIHNob3cgb3Igbm90XG4gICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1Nob3dSZXN1bHRMaXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzdWx0TWFuYWdlci5pc1Nob3dSZXN1bHRMaXN0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZSB0b2dnbGUgYnV0dG9uIGltYWdlIGJ5IGF1dG8gY29tcGxldGUgc3RhdGVcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzVXNlIHdoZXRoZXIgdXNlIGF1dG8gY29tcGxldGUgb3Igbm90XG4gICAgICovXG4gICAgc2V0VG9nZ2xlQnRuSW1nOiBmdW5jdGlvbihpc1VzZSkge1xuICAgICAgICB0aGlzLmlucHV0TWFuYWdlci5zZXRUb2dnbGVCdG5JbWcoaXNVc2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIHNlYXJjaCByZXN1bHQgbGlzdCBhcmVhXG4gICAgICovXG4gICAgaGlkZVJlc3VsdExpc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5pc1VzZUF1dG9Db21wbGV0ZSgpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc3VsdE1hbmFnZXIuaGlkZVJlc3VsdExpc3QoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHNlYXJjaCByZXN1bHQgbGlzdCBhcmVhXG4gICAgICovXG4gICAgc2hvd1Jlc3VsdExpc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5pc1VzZUF1dG9Db21wbGV0ZSgpKSB7XG4gICAgICAgICAgICB0aGlzLnJlc3VsdE1hbmFnZXIuc2hvd1Jlc3VsdExpc3QoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNb3ZlIHRvIG5leHQgaXRlbSBpbiByZXN1bHQgbGlzdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmxvdyBEaXJlY3Rpb24gdG8gbW92ZS5cbiAgICAgKi9cbiAgICBtb3ZlTmV4dExpc3Q6IGZ1bmN0aW9uKGZsb3cpIHtcbiAgICAgICAgdGhpcy5yZXN1bHRNYW5hZ2VyLm1vdmVOZXh0TGlzdChmbG93KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IHRleHQgdG8gYXV0byBjb21wbGV0ZSBzd2l0Y2hcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzVXNlIFdoZXRoZXIgdXNlIGF1dG8gY29tcGxldGUgb3Igbm90XG4gICAgICovXG4gICAgY2hhbmdlT25PZmZUZXh0OiBmdW5jdGlvbihpc1VzZSkge1xuICAgICAgICB0aGlzLnJlc3VsdE1hbmFnZXIuY2hhbmdlT25PZmZUZXh0KGlzVXNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHJlc3VsdE1hbmFnZXIgd2hldGhlciBsb2NrZWQgb3Igbm90XG4gICAgICogQHJldHVybiB7Qm9vbGVhbn0gcmVzdWx0TWFuYWdlcuydmCBpc01vdmVk6rCSXG4gICAgICovXG4gICAgZ2V0TW92ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXN1bHRNYW5hZ2VyLmlzTW92ZWQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCByZXN1bHRNYW5hZ2VyJ3MgaXNNb3ZlZCBmaWVsZFxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNNb3ZlZCBXaGV0aGVyIGxvY2tlZCBvciBub3QuXG4gICAgICovXG4gICAgc2V0TW92ZWQ6IGZ1bmN0aW9uKG1vdmVkKSB7XG4gICAgICAgIHRoaXMucmVzdWx0TWFuYWdlci5pc01vdmVkID0gbW92ZWQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHNlcmFjaEFwaVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHNlYXJjaEFwaeyYteyFmCDshKTsoJVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqICBhdXRvQ29tcGxldGUuc2V0U2VhcmNoQXBpKHtcbiAgICAgKiAgICAgICdzdCcgOiA5MzUxLFxuICAgICAqICAgICAgJ3JfbHQnIDogNzE4NyxcbiAgICAgKiAgICAgICdyX2VuYycgOiAnVVRGLTgnLFxuICAgICAqICAgICAgJ3FfZW5jJyA6ICdVVEYtOCcsXG4gICAgICogICAgICAncl9mb3JtYXQnIDogJ2pzb24nXG4gICAgICogIH0pO1xuICAgICAqL1xuICAgIHNldFNlYXJjaEFwaTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBuZS51dGlsLmV4dGVuZCh0aGlzLm9wdGlvbnMuc2VhcmNoQXBpLCBvcHRpb25zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogY2xlYXIgcmVhZHkgdmFsdWUgYW5kIHNldCBpZGxlIHN0YXRlXG4gICAgICovXG4gICAgY2xlYXJSZWFkeVZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKG5lLnV0aWwuaXNFeGlzdHkodGhpcy5yZWFkeVZhbHVlKSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0KHRoaXMucmVhZHlWYWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzSWRsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWFkeVZhbHVlID0gbnVsbDtcbiAgICB9XG59KTtcbm5lLnV0aWwuQ3VzdG9tRXZlbnRzLm1peGluKEF1dG9Db21wbGV0ZSk7XG5tb2R1bGUuZXhwb3J0cyA9IEF1dG9Db21wbGV0ZTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBEYXRhTWFuYWdlciB0aGF0IHJlcXVlc3QgZGF0YSBhdCBhcGkgd2l0aCBpbnB1dCBxdWVyeVxuICogQHZlcnNpb24gMS4xLjBcbiAqIEBhdXRob3IgTkhOIEVudGVydGFpbm1lbnQgRkUgZGV2IHRlYW0uIEplaW4gWWk8amVpbi55aUBuaG5lbnQuY29tPlxuICovXG5cbi8qKlxuICogVW5pdCBvZiBhdXRvIGNvbXBsZXRlIGNvbm5lY3Rpbmcgc2VydmVyLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBEYXRhTWFuYWdlciA9IG5lLnV0aWwuZGVmaW5lQ2xhc3MoLyoqQGxlbmRzIERhdGFNYW5hZ2VyLnByb3RvdHlwZSAqL3tcbiAgICBpbml0OiBmdW5jdGlvbihhdXRvQ29tcGxldGVPYmosIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT0gMikge1xuICAgICAgICAgICAgYWxlcnQoJ2FyZ3VtZW50IGxlbmd0aCBlcnJvciAhJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iaiA9IGF1dG9Db21wbGV0ZU9iajtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBkYXRhIGF0IGFwaSBzZXJ2ZXIgdXNlIGpzb25wXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGtleXdvcmQgU3RyaW5nIHRvIHJlcXVlc3QgYXQgc2VydmVyXG4gICAgICovXG4gICAgcmVxdWVzdDogZnVuY3Rpb24oa2V5d29yZCkge1xuXG4gICAgICAgIHZhciByc0tleVdyb2QgPSBrZXl3b3JkLnJlcGxhY2UoL1xccy9nLCAnJyk7XG5cbiAgICAgICAgaWYgKCFrZXl3b3JkIHx8ICFyc0tleVdyb2QpIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLmhpZGVSZXN1bHRMaXN0KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGF0YUNhbGxiYWNrID0gZnVuY3Rpb24oKXt9LFxuICAgICAgICAgICAgZGVmYXVsdFBhcmFtID0ge1xuICAgICAgICAgICAgICAgIHE6IGtleXdvcmQsXG4gICAgICAgICAgICAgICAgcl9lbmM6ICdVVEYtOCcsXG4gICAgICAgICAgICAgICAgcV9lbmM6ICdVVEYtOCcsXG4gICAgICAgICAgICAgICAgcl9mb3JtYXQ6ICdqc29uJyxcbiAgICAgICAgICAgICAgICBfY2FsbGJhY2s6ICdkYXRhQ2FsbGJhY2snXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVxdWVzdFBhcmFtID0gbmUudXRpbC5leHRlbmQodGhpcy5vcHRpb25zLnNlYXJjaEFwaSwgZGVmYXVsdFBhcmFtKSxcbiAgICAgICAgICAgIGtleURhdGFzO1xuXG4gICAgICAgICQuYWpheCh0aGlzLm9wdGlvbnMuc2VhcmNoVXJsLCB7XG4gICAgICAgICAgICAnZGF0YVR5cGUnOiAnanNvbnAnLFxuICAgICAgICAgICAgJ2pzb25wQ2FsbGJhY2snOiAnZGF0YUNhbGxiYWNrJyxcbiAgICAgICAgICAgICdkYXRhJzogcmVxdWVzdFBhcmFtLFxuICAgICAgICAgICAgJ3R5cGUnOiAnZ2V0JyxcbiAgICAgICAgICAgICdzdWNjZXNzJzogbmUudXRpbC5iaW5kKGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBrZXlEYXRhcyA9IHRoaXMuX2dldENvbGxlY3Rpb25EYXRhKGRhdGFPYmopO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5zZXRRdWVyeXMoZGF0YU9iai5xdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLnNldFNlcnZlckRhdGEoa2V5RGF0YXMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5jbGVhclJlYWR5VmFsdWUoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignW0RhdGFNYW5hZ2VyXSBSZXF1ZXN0IGZhaWxkLicgLCBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIE1ha2UgY29sbGVjdGlvbiBkYXRhIHRvIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YU9iaiBDb2xsZWN0aW9uIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0Q29sbGVjdGlvbkRhdGE6IGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBkYXRhT2JqLmNvbGxlY3Rpb25zLFxuICAgICAgICAgICAgaXRlbURhdGFMaXN0ID0gW107XG5cbiAgICAgICAgbmUudXRpbC5mb3JFYWNoKGNvbGxlY3Rpb24sIGZ1bmN0aW9uKGl0ZW1TZXQpIHtcblxuICAgICAgICAgICAgaWYobmUudXRpbC5pc0VtcHR5KGl0ZW1TZXQuaXRlbXMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY3JlYXRlIGNvbGxlY3Rpb24gaXRlbXMuXG4gICAgICAgICAgICB2YXIga2V5cyA9IHRoaXMuX2dldFJlZGlyZWN0RGF0YShpdGVtU2V0KTtcblxuICAgICAgICAgICAgaXRlbURhdGFMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICd0aXRsZScsXG4gICAgICAgICAgICAgICAgdmFsdWVzOiBbaXRlbVNldC50aXRsZV1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaXRlbURhdGFMaXN0ID0gaXRlbURhdGFMaXN0LmNvbmNhdChrZXlzKTtcblxuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICByZXR1cm4gaXRlbURhdGFMaXN0O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogTWFrZSBpdGVtIG9mIGNvbGxlY3Rpb24gdG8gZGlzcGxheVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpdGVtU2V0IEl0ZW0gb2YgY29sbGVjdGlvbiBkYXRhXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgX2dldFJlZGlyZWN0RGF0YTogZnVuY3Rpb24oaXRlbVNldCkge1xuICAgICAgICB2YXIgdHlwZSA9IGl0ZW1TZXQudHlwZSxcbiAgICAgICAgICAgIGluZGV4ID0gaXRlbVNldC5pbmRleCxcbiAgICAgICAgICAgIGRlc3QgPSBpdGVtU2V0LmRlc3RpbmF0aW9uLFxuICAgICAgICAgICAgaXRlbXMgPSBbXTtcblxuICAgICAgICBuZS51dGlsLmZvckVhY2hBcnJheShpdGVtU2V0Lml0ZW1zLCBmdW5jdGlvbihpdGVtLCBpZHgpIHtcblxuICAgICAgICAgICAgaWYgKGlkeCA8PSAodGhpcy5vcHRpb25zLnZpZXdDb3VudCAtIDEpKSB7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlczogaXRlbSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgICAgICAgICBkZXN0OiBkZXN0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFNYW5hZ2VyO1xuIiwiLyoqXG4gKiBAZmlsZU92ZXJ2aWV3IElucHV0TWFuYWdlciBzdXBwb3J0IGlucHV0IGVsZW1lbnQgZXZlbnRzIGFuZCBhbGwgb2YgaW5wdXQgZnVuY3Rpb25cbiAqIEB2ZXJzaW9uIDEuMS4wXG4gKiBAYXV0aG9yIE5ITiBFbnRlcnRhaW5tZW50IEZFIGRldiB0ZWFtLiBKZWluIFlpPGplaW4ueWlAbmhuZW50LmNvbT5cbiAqL1xuXG4vKipcbiAqIFVuaXQgb2YgYXV0byBjb21wbGV0ZSBjb21wb25lbnQgdGhhdCBiZWxvbmcgd2l0aCBpbnB1dCBlbGVtZW50LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBJbnB1dE1hbmFnZXIgPSBuZS51dGlsLmRlZmluZUNsYXNzKC8qKkBsZW5kcyBJbnB1dE1hbmFnZXIucHJvdG90eXBlICove1xuXG4gICAgLyoqXG4gICAgICoga2V5Ym9hcmQgSW5wdXQgS2V5Q29kZSBlbnVtXG4gICAgICovXG4gICAga2V5Q29kZU1hcDoge1xuICAgICAgICAnVEFCJyA6IDksXG4gICAgICAgICdVUF9BUlJPVycgOiAzOCxcbiAgICAgICAgJ0RPV05fQVJST1cnIDogNDBcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhdXRvQ29tcGxldGVPYmogQXV0b0NvbXBsZXRlIGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgYXV0byBjb21wbGV0ZSBvcHRpb25zXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24oYXV0b0NvbXBsZXRlT2JqLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoICE9IDIpIHtcbiAgICAgICAgICAgIGFsZXJ0KCdhcmd1bWVudCBsZW5ndGggZXJyb3IgIScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqID0gYXV0b0NvbXBsZXRlT2JqO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgICAgIC8vIFNhdmUgZWxlbWVudHMgZnJvbSBjb25maWd1cmF0aW9uLlxuICAgICAgICB0aGlzLiRzZWFyY2hCb3ggPSB0aGlzLm9wdGlvbnMuc2VhcmNoQm94RWxlbWVudDtcbiAgICAgICAgdGhpcy4kdG9nZ2xlQnRuID0gdGhpcy5vcHRpb25zLnRvZ2dsZUJ0bkVsZW1lbnQ7XG4gICAgICAgIHRoaXMuJG9yZ1F1ZXJ5ID0gdGhpcy5vcHRpb25zLm9yZ1F1ZXJ5RWxlbWVudDtcbiAgICAgICAgdGhpcy4kZm9ybUVsZW1lbnQgPSB0aGlzLm9wdGlvbnMuZm9ybUVsZW1lbnQ7XG5cbiAgICAgICAgdGhpcy5pbnB1dFZhbHVlID0gdGhpcy4kc2VhcmNoQm94LnZhbCgpO1xuXG4gICAgICAgIHRoaXMuX2F0dGFjaEV2ZW50KCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIGlucHV0IGVsZW1lbnQgdmFsdWVcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZ2V0VmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kc2VhcmNoQm94LnZhbCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQga2V5d29yZCB0byBpbnB1dCBlbGVtZW50XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUga2V5d29yZCB0byBzZXQgdmFsdWUuXG4gICAgICovXG4gICAgc2V0VmFsdWU6IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICB0aGlzLmlucHV0VmFsdWUgPSBzdHI7XG4gICAgICAgIHRoaXMuJHNlYXJjaEJveC52YWwoc3RyKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVhZCBjb25maWcgZmlsZXMgcGFyYW1ldGVyIG9wdGlvbiBhbmQgc2V0IHBhcmFtZXRlci5cbiAgICAgKiBAcGFyYW0ge2FycmF5fSBvcHRpb25zIFRoZSBwYXJhbWV0ZXJzIGZyb20gY29uZmlnXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IFRoZSBpbmRleCBmb3Igc2V0dGluZyBrZXkgdmFsdWVcbiAgICAgKi9cbiAgICBzZXRQYXJhbXM6IGZ1bmN0aW9uKG9wdGlvbnMsIGluZGV4KSB7XG5cbiAgICAgICAgdmFyIG9wdCA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgIGxpc3RDb25maWcgPSBvcHQubGlzdENvbmZpZ1tpbmRleF0sXG4gICAgICAgICAgICBzdGF0aWNzID0gb3B0LnN0YXRpY1BhcmFtc1tsaXN0Q29uZmlnLnN0YXRpY1BhcmFtc107XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgJiYgbmUudXRpbC5pc1N0cmluZyhvcHRpb25zKSkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMuc3BsaXQoJywnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoIW9wdGlvbnMgfHwgbmUudXRpbC5pc0VtcHR5KG9wdGlvbnMpKSAmJiAhbmUudXRpbC5pc0V4aXN0eShzdGF0aWNzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fY3JlYXRlUGFyYW1TZXRCeVR5cGUob3B0aW9ucywgaW5kZXgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgaW5wdXRFbGVtZW50IGJ5IHR5cGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBUaGUgdmFsdWVzIHRvIHNlbmQgc2VhcmNoIGFwaVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBUaGUgaW5kZXggb2YgcXVlcnkga2V5IGFycmF5XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfY3JlYXRlUGFyYW1TZXRCeVR5cGU6IGZ1bmN0aW9uKG9wdGlvbnMsIGluZGV4KSB7XG5cbiAgICAgICAgdmFyIGtleSxcbiAgICAgICAgICAgIG9wdCA9IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgIGxpc3RDb25maWcgPSBvcHQubGlzdENvbmZpZ1tpbmRleF0sXG4gICAgICAgICAgICBjb25maWcgPSBvcHQuc3ViUXVlcnlTZXRbbGlzdENvbmZpZy5zdWJRdWVyeVNldF0sXG4gICAgICAgICAgICBzdGF0aWNzID0gb3B0LnN0YXRpY1BhcmFtc1tsaXN0Q29uZmlnLnN0YXRpY1BhcmFtc107XG5cbiAgICAgICAgaWYgKCF0aGlzLmhpZGRlbnMpIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVBhcmFtQ29udGFpbmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZS51dGlsLmZvckVhY2gob3B0aW9ucywgZnVuY3Rpb24odmFsdWUsIGlkeCkge1xuXG4gICAgICAgICAgICBrZXkgPSBjb25maWdbaWR4XTtcbiAgICAgICAgICAgIHRoaXMuaGlkZGVucy5hcHBlbmQoJCgnPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiJyArIGtleSArICdcIiB2YWx1ZT1cIicgKyB2YWx1ZSArICdcIiAvPicpKTtcblxuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICBpZiAoc3RhdGljcykge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlU3RhdGljUGFyYW1zKHN0YXRpY3MpO1xuICAgICAgICB9XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzdGF0aWMgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdGF0aWNzIFN0YXRpYyB2YWx1ZXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9jcmVhdGVTdGF0aWNQYXJhbXM6IGZ1bmN0aW9uKHN0YXRpY3MpIHtcbiAgICAgICAgc3RhdGljcyA9IHN0YXRpY3Muc3BsaXQoJywnKTtcbiAgICAgICAgbmUudXRpbC5mb3JFYWNoKHN0YXRpY3MsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB2YWwgPSB2YWx1ZS5zcGxpdChcIj1cIik7XG4gICAgICAgICAgICB0aGlzLmhpZGRlbnMuYXBwZW5kKCQoJzxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIicgKyB2YWxbMF0gKyAnXCIgdmFsdWU9XCInICsgdmFsWzFdICsgJ1wiIC8+JykpO1xuXG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgd3JhcHBlciB0aGF0IGJlY29tZSBjb250YWluZXIgb2YgaGlkZGVuIGVsZW1lbnRzLlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NyZWF0ZVBhcmFtQ29udGFpbmVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5oaWRkZW5zID0gJCgnPGRpdiBjbGFzcz1cImhpZGRlbi1pbnB1dHNcIj48L2Rpdj4nKTtcbiAgICAgICAgdGhpcy5oaWRkZW5zLmhpZGUoKTtcbiAgICAgICAgdGhpcy5oaWRkZW5zLmFwcGVuZFRvKCQodGhpcy4kZm9ybUVsZW1lbnQpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIHRvZ2dsZSBidXR0b24gaW1hZ2UuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBpc1VzZSDsnpDrj5nsmYTshLEg7IKs7JqpIOyXrOu2gFxuICAgICAqL1xuICAgIHNldFRvZ2dsZUJ0bkltZzogZnVuY3Rpb24oaXNVc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMudG9nZ2xlSW1nIHx8ICEodGhpcy4kdG9nZ2xlQnRuKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzVXNlKSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGVCdG4uYXR0cignc3JjJywgdGhpcy5vcHRpb25zLnRvZ2dsZUltZy5vbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGVCdG4uYXR0cignc3JjJywgdGhpcy5vcHRpb25zLnRvZ2dsZUltZy5vZmYpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqIFByaXZhdGUgRnVuY3Rpb25zICoqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgIC8qKlxuICAgICAqIEV2ZW50IGJpbmRpbmdcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9hdHRhY2hFdmVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8v6rKA7IOJ7LC97JeQIGZvY3VzLCBrZXl1cCwga2V5ZG93biwgY2xpY2sg7J2067Kk7Yq4IOuwlOyduOuUqS5cbiAgICAgICAgdGhpcy4kc2VhcmNoQm94LmJpbmQoJ2ZvY3VzIGtleXVwIGtleWRvd24gYmx1ciBjbGljaycsICQucHJveHkoZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdmb2N1cycgOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2JsdXInIDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25CbHVyKGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdrZXl1cCcgOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbktleVVwKGUpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdrZXlkb3duJyA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uS2V5RG93bihlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnY2xpY2snIDpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25DbGljaygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpKTtcblxuICAgICAgICBpZiAodGhpcy4kdG9nZ2xlQnRuKSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGVCdG4uYmluZCgnY2xpY2snLCAkLnByb3h5KGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vbkNsaWNrVG9nZ2xlKCk7XG4gICAgICAgICAgICB9LCB0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2F2ZSB1c2VyIHF1ZXJ5IGludG8gaGlkZGVuIGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgc3RyaW5nIHR5cGVkIGJ5IHVzZXJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9zZXRPcmdRdWVyeTogZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgIHRoaXMuJG9yZ1F1ZXJ5LnZhbChzdHIpO1xuICAgIH0sXG5cbiAgICAvKioqKioqKioqKioqKioqKioqKioqKioqKioqKiBFdmVudCBIYW5kbGVycyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiAgICAvKipcbiAgICAgKiBJbnB1dCBlbGVtZW50IG9uY2xpY2sgZXZlbnQgaGFuZGxlclxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX29uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL+yeheugpeuQnCDtgqTsm4zrk5zqsIAg7JeG6rGw64KYIOyekOuPmeyZhOyEsSDquLDriqUg7IKs7Jqp7ZWY7KeAIOyViuycvOuptCDtjrzsuaAg7ZWE7JqUIOyXhuycvOuvgOuhnCDqt7jrg6Ug66as7YS07ZWY6rOgIOuBnS5cbiAgICAgICAgaWYgKCF0aGlzLmF1dG9Db21wbGV0ZU9iai5nZXRWYWx1ZSgpIHx8XG4gICAgICAgICAgICAhdGhpcy5hdXRvQ29tcGxldGVPYmouaXNVc2VBdXRvQ29tcGxldGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuYXV0b0NvbXBsZXRlT2JqLmlzU2hvd1Jlc3VsdExpc3QoKSkge1xuICAgICAgICAgICAgLy/qsrDqs7wg66as7Iqk7Yq4IOyYgeyXreydtCBzaG93IOyDge2DnOydtOuptChpc1Jlc3VsdFNob3dpbmc9PXRydWUpIOqysOqzvCDrpqzsiqTtirggaGlkZSDsmpTssq1cbiAgICAgICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLmhpZGVSZXN1bHRMaXN0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvL+qysOqzvCDrpqzsiqTtirgg7JiB7Jet7J20IGhpZGUg7IOB7YOc7J2066m0KGlzUmVzdWx0U2hvd2luZz09ZmFsc2UpIOqysOqzvCDrpqzsiqTtirggc2hvdyDsmpTssq1cbiAgICAgICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLnNob3dSZXN1bHRMaXN0KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5wdXQgZWxlbWVudCBmb2N1cyBldmVudCBoYW5kbGVyXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25Gb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vc2V0SW50ZXJ2YWwg7ISk7KCV7ZW07IScIOydvOyglSDsi5zqsIQg7KO86riw66GcIF9vbldhdGNoIO2VqOyImOulvCDsi6TtlontlZzri6QuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWxJZCA9IHNldEludGVydmFsKCQucHJveHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLl9vbldhdGNoKCk7XG4gICAgICAgIH0sIHRoaXMpLCB0aGlzLm9wdGlvbnMud2F0Y2hJbnRlcnZhbCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJvb3AgZm9yIGNoZWNrIHVwZGF0ZSBpbnB1dCBlbGVtZW50XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25XYXRjaDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLiRzZWFyY2hCb3gudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRPcmdRdWVyeSgnJyk7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5zZXRNb3ZlZChmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pbnB1dFZhbHVlICE9PSB0aGlzLiRzZWFyY2hCb3gudmFsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuaW5wdXRWYWx1ZSA9IHRoaXMuJHNlYXJjaEJveC52YWwoKTtcbiAgICAgICAgICAgIHRoaXMuX29uQ2hhbmdlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuYXV0b0NvbXBsZXRlT2JqLmdldE1vdmVkKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3NldE9yZ1F1ZXJ5KHRoaXMuJHNlYXJjaEJveC52YWwoKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5wdXQgZWxlbWVudCBrZXl1cCBldmVudCBoYW5kbGVyXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25LZXlVcDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0VmFsdWUgIT09IHRoaXMuJHNlYXJjaEJveC52YWwoKSkge1xuICAgICAgICAgICAgdGhpcy5pbnB1dFZhbHVlID0gdGhpcy4kc2VhcmNoQm94LnZhbCgpO1xuICAgICAgICAgICAgdGhpcy5fb25DaGFuZ2UoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnB1dCBlbGVtZW50IG9uY2hhbmdlIGV2ZW50IGhhbmRsZXJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vbkNoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5hdXRvQ29tcGxldGVPYmouaXNVc2VBdXRvQ29tcGxldGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuYXV0b0NvbXBsZXRlT2JqLmlzSWRsZSkge1xuICAgICAgICAgICAgdGhpcy5hdXRvQ29tcGxldGVPYmouaXNJZGxlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5yZXF1ZXN0KHRoaXMuJHNlYXJjaEJveC52YWwoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5yZWFkeVZhbHVlID0gdGhpcy4kc2VhcmNoQm94LnZhbCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIElucHV0IGVsZW1lbnQgYmx1ciBldmVudCBoYW5kbGVyXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb25CbHVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJ2YWxJZCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsSWQpO1xuICAgICAgICAgICAgdGhpcy5pbnRlcnZhbElkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnB1dCBlbGVtZW50IGtleWRvd24gZXZlbnQgaGFuZGxlclxuICAgICAqIFNldCBhY3Rpbm8gYnkgaW5wdXQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIGtleURvd24gRXZlbnQgaW5zdGFuY2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vbktleURvd246IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGF1dG9Db21wbGV0ZU9iaiA9IHRoaXMuYXV0b0NvbXBsZXRlT2JqO1xuXG4gICAgICAgIGlmICghYXV0b0NvbXBsZXRlT2JqLmlzVXNlQXV0b0NvbXBsZXRlKCkgfHxcbiAgICAgICAgICAgICFhdXRvQ29tcGxldGVPYmouaXNTaG93UmVzdWx0TGlzdCgpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29kZSA9IGUua2V5Q29kZSxcbiAgICAgICAgICAgIGZsb3cgPSBudWxsLFxuICAgICAgICAgICAgY29kZU1hcCA9IHRoaXMua2V5Q29kZU1hcCxcbiAgICAgICAgICAgIGZsb3dNYXAgPSBhdXRvQ29tcGxldGVPYmouZmxvd01hcDtcblxuICAgICAgICBpZiAoY29kZSA9PT0gY29kZU1hcC5UQUIpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGZsb3cgPSBlLnNoaWZ0S2V5ID8gZmxvd01hcC5ORVhUIDogZmxvd01hcC5QUkVWO1xuICAgICAgICB9IGVsc2UgaWYgKGNvZGUgPT09IGNvZGVNYXAuRE9XTl9BUlJPVykge1xuICAgICAgICAgICAgZmxvdyA9IGZsb3dNYXAuTkVYVDtcbiAgICAgICAgfSBlbHNlIGlmIChjb2RlID09PSBjb2RlTWFwLlVQX0FSUk9XKSB7XG4gICAgICAgICAgICBmbG93ID0gZmxvd01hcC5QUkVWO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0b0NvbXBsZXRlT2JqLm1vdmVOZXh0TGlzdChmbG93KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYnV0dG9uIGNsaWNrIGV2ZW50IGhhbmRsZXJcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vbkNsaWNrVG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmF1dG9Db21wbGV0ZU9iai5pc1VzZUF1dG9Db21wbGV0ZSgpKSB7XG4gICAgICAgICAgICB0aGlzLnNldFRvZ2dsZUJ0bkltZyh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLnNldENvb2tpZVZhbHVlKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5hdXRvQ29tcGxldGVPYmouY2hhbmdlT25PZmZUZXh0KGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLmhpZGVSZXN1bHRMaXN0KCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvZ2dsZUJ0bkltZyhmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5zZXRDb29raWVWYWx1ZShmYWxzZSk7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5jaGFuZ2VPbk9mZlRleHQodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dE1hbmFnZXI7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgUmVzdWx0TWFuYWdlciBkcmF3IHJlc3VsdCBsaXN0IGFuZCBhcHBseSB0ZW1wbGF0ZS5cbiAqIEB2ZXJzaW9uIDEuMS4wXG4gKiBAYXV0aG9yICBOSE4gZW50ZXJ0YWlubWVudCBGRSBkZXYgdGVhbSBKZWluIFlpPGplaW4ueWlAbmhuZW50LmNvbT5cbiAqL1xuXG4vKipcbiAqIFVuaXQgb2YgYXV0byBjb21wbGV0ZSB0aGF0IGJlbG9uZyB3aXRoIHNlYXJjaCByZXN1bHQgbGlzdC5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgUmVzdWx0TWFuYWdlciA9IG5lLnV0aWwuZGVmaW5lQ2xhc3MoLyoqIEBsZW5kcyBSZXN1bHRNYW5hZ2VyLnByb3RvdHlwZSAqL3tcbiAgICAvKipcbiAgICAgKiBJbml0YWlsaXplXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24oYXV0b0NvbXBsZXRlT2JqLCBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqID0gYXV0b0NvbXBsZXRlT2JqO1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgICAgIHRoaXMuJHJlc3VsdExpc3QgPSB0aGlzLm9wdGlvbnMucmVzdWx0TGlzdEVsZW1lbnQ7XG4gICAgICAgIHRoaXMucmVzdWx0U2VsZWN0b3IgPSB0aGlzLm9wdGlvbnMucmVzdWx0TGlzdEVsZW1lbnQ7XG4gICAgICAgIHRoaXMudmlld0NvdW50ID0gdGhpcy5vcHRpb25zLnZpZXdDb3VudCB8fCAxMDtcbiAgICAgICAgdGhpcy4kb25PZmZUeHQgPSB0aGlzLm9wdGlvbnMub25vZmZUZXh0RWxlbWVudDtcbiAgICAgICAgdGhpcy5tb3VzZU92ZXJDbGFzcyA9IHRoaXMub3B0aW9ucy5tb3VzZU92ZXJDbGFzcztcbiAgICAgICAgdGhpcy5mbG93TWFwID0gdGhpcy5hdXRvQ29tcGxldGVPYmouZmxvd01hcDtcblxuICAgICAgICB0aGlzLl9hdHRhY2hFdmVudCgpO1xuXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gbnVsbDtcblxuICAgICAgICB0aGlzLmlzTW92ZWQgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGxhc3QgcmVzdWx0IGxpc3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9kZWxldGVCZWZvcmVFbGVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kcmVzdWx0TGlzdC5odG1sKCcnKTtcbiAgICAgICAgdGhpcy4kcmVzdWx0TGlzdC5oaWRlKCk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRHJhdyByZXN1bHQgZm9ybSBhcGkgc2VydmVyXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YUFyciBSZXN1bHQgZGF0YVxuICAgICAqL1xuICAgIGRyYXc6IGZ1bmN0aW9uKGRhdGFBcnIpIHtcblxuICAgICAgICB0aGlzLl9kZWxldGVCZWZvcmVFbGVtZW50KCk7XG5cbiAgICAgICAgdmFyIGxlbiA9IGRhdGFBcnIubGVuZ3RoO1xuXG4gICAgICAgIGlmIChsZW4gPCAxKSB7XG4gICAgICAgICAgICB0aGlzLl9oaWRlQm90dG9tQXJlYSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fbWFrZVJlc3VsdExpc3QoZGF0YUFyciwgbGVuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJHJlc3VsdExpc3Quc2hvdygpO1xuICAgICAgICAvLyBzaG93IGF1dG8gY29tcGxldGUgc3dpdGNoXG4gICAgICAgIHRoaXMuX3Nob3dCb3R0b21BcmVhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1ha2Ugc2VhcmNoIHJlc3VsdCBsaXN0IGVsZW1lbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9tYWtlUmVzdWx0TGlzdDogZnVuY3Rpb24oZGF0YUFyciwgbGVuKSB7XG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZSxcbiAgICAgICAgICAgIGNvbmZpZyA9IHRoaXMub3B0aW9ucy5saXN0Q29uZmlnLFxuICAgICAgICAgICAgdG1wbCxcbiAgICAgICAgICAgIHVzZVRpdGxlID0gKHRoaXMub3B0aW9ucy51c2VUaXRsZSAmJiAhIXRlbXBsYXRlLnRpdGxlKSxcbiAgICAgICAgICAgIGluZGV4LFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIHRtcGxWYWx1ZSxcbiAgICAgICAgICAgICRlbCxcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB0eXBlID0gZGF0YUFycltpXS50eXBlO1xuICAgICAgICAgICAgaW5kZXggPSBkYXRhQXJyW2ldLmluZGV4O1xuICAgICAgICAgICAgdG1wbCA9IGNvbmZpZ1tpbmRleF0gPyB0ZW1wbGF0ZVtjb25maWdbaW5kZXhdLnRlbXBsYXRlXSA6IHRlbXBsYXRlLmRlZmF1bHRzO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICd0aXRsZScpIHtcbiAgICAgICAgICAgICAgICB0bXBsID0gdGVtcGxhdGUudGl0bGU7XG4gICAgICAgICAgICAgICAgaWYgKCF1c2VUaXRsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0bXBsVmFsdWUgPSB0aGlzLl9nZXRUbXBsRGF0YSh0bXBsLmF0dHIsIGRhdGFBcnJbaV0pO1xuICAgICAgICAgICAgJGVsID0gJCh0aGlzLl9hcHBseVRlbXBsYXRlKHRtcGwuZWxlbWVudCwgdG1wbFZhbHVlKSk7XG4gICAgICAgICAgICAkZWwuYXR0cignZGF0YS1wYXJhbXMnLCB0bXBsVmFsdWUucGFyYW1zKTtcbiAgICAgICAgICAgICRlbC5hdHRyKCdkYXRhLWluZGV4JywgaW5kZXgpO1xuICAgICAgICAgICAgdGhpcy4kcmVzdWx0TGlzdC5hcHBlbmQoJGVsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBNYWtlIHRlbXBsYXRlIGRhdGFcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBhdHRycyBUZW1wbGF0ZSBhdHRyaWJ1dGVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd8T2JqZWN0fSBkYXRhIFRoZSBkYXRhIHRvIG1ha2UgdGVtcGxhdGVcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0VG1wbERhdGE6IGZ1bmN0aW9uKGF0dHJzLCBkYXRhKSB7XG4gICAgICAgIHZhciB0bXBsVmFsdWUgPSB7fSxcbiAgICAgICAgICAgIHZhbHVlcyA9IGRhdGEudmFsdWVzIHx8IG51bGw7XG5cbiAgICAgICAgaWYgKG5lLnV0aWwuaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgICAgICAgIHRtcGxWYWx1ZVthdHRyc1swXV0gPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIHRtcGxWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBuZS51dGlsLmZvckVhY2goYXR0cnMsIGZ1bmN0aW9uKGF0dHIsIGlkeCkge1xuXG4gICAgICAgICAgICB0bXBsVmFsdWVbYXR0cl0gPSB2YWx1ZXNbaWR4XTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBpZihhdHRycy5sZW5ndGggPCB2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0bXBsVmFsdWUucGFyYW1zID0gdmFsdWVzLnNsaWNlKGF0dHJzLmxlbmd0aCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG1wbFZhbHVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gd2hldGhlciByZXN1bHQgbGlzdCBzaG93IG9yIG5vdFxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICovXG4gICAgaXNTaG93UmVzdWx0TGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAodGhpcy4kcmVzdWx0TGlzdC5jc3MoJ2Rpc3BsYXknKSA9PT0gJ2Jsb2NrJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgcmVzdWx0IGxpc3QgYXJlYVxuICAgICAqL1xuICAgIGhpZGVSZXN1bHRMaXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kcmVzdWx0TGlzdC5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICB0aGlzLl9oaWRlQm90dG9tQXJlYSgpO1xuICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5pc0lkbGUgPSB0cnVlO1xuICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5maXJlKCdjbG9zZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHJlc3VsdCBsaXN0IGFyZWFcbiAgICAgKi9cbiAgICBzaG93UmVzdWx0TGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYuJHJlc3VsdExpc3QuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuX3Nob3dCb3R0b21BcmVhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vdmUgZm9jdXMgdG8gbmV4dCBpdGVtLCBjaGFuZ2UgaW5wdXQgZWxlbWVudCB2YWx1ZSBhcyBmb2N1cyB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmxvdyBEaXJlY3Rpb24gYnkga2V5IGNvZGVcbiAgICAgKi9cbiAgICBtb3ZlTmV4dExpc3Q6IGZ1bmN0aW9uKGZsb3cpIHtcbiAgICAgICAgdmFyIGZsb3dNYXAgPSB0aGlzLmZsb3dNYXAsXG4gICAgICAgICAgICBzZWxlY3RFbCA9IHRoaXMuc2VsZWN0ZWRFbGVtZW50LFxuICAgICAgICAgICAgZ2V0TmV4dCA9IChmbG93ID09PSBmbG93TWFwLk5FWFQpID8gdGhpcy5fZ2V0TmV4dCA6IHRoaXMuX2dldFByZXYsXG4gICAgICAgICAgICBnZXRCb3VuZCA9IChmbG93ID09PSBmbG93TWFwLk5FWFQpID8gdGhpcy5fZ2V0Rmlyc3QgOiB0aGlzLl9nZXRMYXN0LFxuICAgICAgICAgICAga2V5d29yZDtcbiAgICAgICAgdGhpcy5pc01vdmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoc2VsZWN0RWwpIHtcbiAgICAgICAgICAgIHNlbGVjdEVsLnJlbW92ZUNsYXNzKHRoaXMubW91c2VPdmVyQ2xhc3MpO1xuICAgICAgICAgICAgc2VsZWN0RWwgPSB0aGlzLnNlbGVjdGVkRWxlbWVudCA9IGdldE5leHQuY2FsbCh0aGlzLCBzZWxlY3RFbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZWxlY3RFbCA9IHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gZ2V0Qm91bmQuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXdvcmQgPSBzZWxlY3RFbC5maW5kKCcua2V5d29yZC1maWVsZCcpLnRleHQoKTtcblxuICAgICAgICBpZiAoc2VsZWN0RWwgJiYga2V5d29yZCkge1xuICAgICAgICAgICAgc2VsZWN0RWwuYWRkQ2xhc3ModGhpcy5tb3VzZU92ZXJDbGFzcyk7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5zZXRWYWx1ZShrZXl3b3JkKTtcbiAgICAgICAgICAgIHRoaXMuX3NldFN1Ym1pdE9wdGlvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoc2VsZWN0RWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVOZXh0TGlzdChmbG93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFnZSB0ZXh0IGJ5IHdoZXRoZXIgYXV0byBjb21wbGV0ZSB1c2Ugb3Igbm90XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBpc1VzZSBvbi9vZmYg7Jes67aAXG4gICAgICovXG4gICAgY2hhbmdlT25PZmZUZXh0OiBmdW5jdGlvbihpc1VzZSkge1xuICAgICAgICBpZiAoaXNVc2UpIHtcbiAgICAgICAgICAgIHRoaXMuJG9uT2ZmVHh0LnRleHQoJ+yekOuPmeyZhOyEsSDsvJzquLAnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZVJlc3VsdExpc3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJG9uT2ZmVHh0LnRleHQoJ+yekOuPmeyZhOyEsSDrgYTquLAnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBhdXRvIGNvbXBsZXRlIGV2ZW50IGJlbG9uZ3Mgd2l0aCByZXN1bHQgbGlzdFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2F0dGFjaEV2ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy4kcmVzdWx0TGlzdC5iaW5kKCdtb3VzZW92ZXIgY2xpY2snLCAkLnByb3h5KGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChlLnR5cGUgPT09ICdtb3VzZW92ZXInKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb25Nb3VzZU92ZXIoZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUudHlwZSA9PT0gJ2NsaWNrJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX29uQ2xpY2soZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpKTtcblxuICAgICAgICBpZiAodGhpcy4kb25PZmZUeHQpIHtcbiAgICAgICAgICAgIHRoaXMuJG9uT2ZmVHh0LmJpbmQoJ2NsaWNrJywgJC5wcm94eShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl91c2VBdXRvQ29tcGxldGUoKTtcbiAgICAgICAgICAgIH0sIHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQoZG9jdW1lbnQpLmJpbmQoJ2NsaWNrJywgJC5wcm94eShmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoZS50YXJnZXQudGFnTmFtZS50b0xvd2VyQ2FzZSgpICE9PSAnaHRtbCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhpZGVSZXN1bHRMaXN0KCk7XG4gICAgICAgIH0sIHRoaXMpKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBIaWdobGlnaHQga2V5IHdvcmRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdG1wbFN0ciBUZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YU9iaiBSZXBsYWNlIHN0cmluZyBtYXBcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfYXBwbHlUZW1wbGF0ZTogZnVuY3Rpb24odG1wbFN0ciwgZGF0YU9iaikge1xuICAgICAgICB2YXIgdGVtcCA9IHt9LFxuICAgICAgICAgICAga2V5U3RyO1xuXG4gICAgICAgIGZvciAoa2V5U3RyIGluIGRhdGFPYmopIHtcbiAgICAgICAgICAgIHRlbXBba2V5U3RyXSA9IGRhdGFPYmpba2V5U3RyXTtcbiAgICAgICAgICAgIGlmIChrZXlTdHIgPT09ICdzdWJqZWN0Jykge1xuICAgICAgICAgICAgICAgIHRlbXAuc3ViamVjdCA9IHRoaXMuX2hpZ2hsaWdodChkYXRhT2JqLnN1YmplY3QpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRhdGFPYmoucHJvcGVydHlJc0VudW1lcmFibGUoa2V5U3RyKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0bXBsU3RyID0gdG1wbFN0ci5yZXBsYWNlKG5ldyBSZWdFeHAoXCJAXCIgKyBrZXlTdHIgKyBcIkBcIiwgXCJnXCIpLCB0ZW1wW2tleVN0cl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0bXBsU3RyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gYXBwbGllZCBoaWdobGlnaHQgZWZmZWN0IGtleSB3b3JkXG4gICAgICogKHRleHQ6IE5pa2UgYWlyICAvICBxdWVyeSA6IFtOaWtlXSAvIFJlc3VsdCA6IDxzdHJvbmc+TmlrZSA8L3N0cm9uZz5haXJcbiAgICAgKiB0ZXh0IDogJ3JoZGlkZGzsmYAg6rOg7JaR7J20JyAvIHF1ZXJ5IDogIFtyaGRpZGRsLCDqs6DslpHsnbRdIC8g66as7YS06rKw6rO8IDxzdHJvbmc+cmhkaWRkbDwvc3Ryb25nPuyZgCA8c3Ryb25nPuqzoOyWkeydtDwvc3Ryb25nPlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0IElucHV0IHN0cmluZ1xuICAgICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9oaWdobGlnaHQ6IGZ1bmN0aW9uKHRleHQpIHtcbiAgICAgICAgdmFyIHF1ZXJ5cyA9IHRoaXMuYXV0b0NvbXBsZXRlT2JqLnF1ZXJ5cyxcbiAgICAgICAgICAgIHJldHVyblN0cjtcblxuICAgICAgICBuZS51dGlsLmZvckVhY2gocXVlcnlzLCBmdW5jdGlvbihxdWVyeSkge1xuXG4gICAgICAgICAgICBpZiAoIXJldHVyblN0cikge1xuICAgICAgICAgICAgICAgIHJldHVyblN0ciA9IHRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm5TdHIgPSB0aGlzLl9tYWtlU3Ryb25nKHJldHVyblN0ciwgcXVlcnkpO1xuXG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgICByZXR1cm4gKHJldHVyblN0ciB8fCB0ZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udGFpbiB0ZXh0IGJ5IHN0cm9uZyB0YWdcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dCBSZWNvbW1lbmQgc2VhcmNoIGRhdGEgIOy2lOyynOqygOyDieyWtCDrjbDsnbTthLBcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcXVlcnkgSW5wdXQga2V5d29yZFxuICAgICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9tYWtlU3Ryb25nOiBmdW5jdGlvbih0ZXh0LCBxdWVyeSkge1xuICAgICAgICBpZiAoIXF1ZXJ5IHx8IHF1ZXJ5Lmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICAgIHJldHVybiB0ZXh0O1xuICAgICAgICB9XG4gICAgICAgIHZhciBlc2NSZWdFeHAgPSBuZXcgUmVnRXhwKFwiWy4qKz98KClcXFxcW1xcXFxde31cXFxcXFxcXF1cIiwgXCJnXCIpLFxuICAgICAgICAgICAgdG1wU3RyID0gcXVlcnkucmVwbGFjZSgvKCkvZywgXCIgXCIpLnJlcGxhY2UoL15cXHMrfFxccyskL2csIFwiXCIpLFxuICAgICAgICAgICAgdG1wQ2hhcmFjdGVycyA9IHRtcFN0ci5tYXRjaCgvXFxTL2cpLFxuICAgICAgICAgICAgdG1wQ2hhckxlbiA9IHRtcENoYXJhY3RlcnMubGVuZ3RoLFxuICAgICAgICAgICAgdG1wQXJyID0gW10sXG4gICAgICAgICAgICByZXR1cm5TdHIgPSAnJyxcbiAgICAgICAgICAgIHJlZ1F1ZXJ5LFxuICAgICAgICAgICAgY250LFxuICAgICAgICAgICAgaTtcblxuICAgICAgICBmb3IgKGkgPSAwLCBjbnQgPSB0bXBDaGFyTGVuOyBpIDwgY250OyBpKyspIHtcbiAgICAgICAgICAgIHRtcEFyci5wdXNoKHRtcENoYXJhY3RlcnNbaV0ucmVwbGFjZSgvW1xcU10rL2csIFwiW1wiICsgdG1wQ2hhcmFjdGVyc1tpXS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoZXNjUmVnRXhwLCBcIlxcXFwkJlwiKSArIFwifFwiICsgdG1wQ2hhcmFjdGVyc1tpXS50b1VwcGVyQ2FzZSgpLnJlcGxhY2UoZXNjUmVnRXhwLCBcIlxcXFwkJlwiKSArIFwiXSBcIikucmVwbGFjZSgvW1xcc10rL2csIFwiW1xcXFxzXSpcIikpO1xuICAgICAgICB9XG5cbiAgICAgICAgdG1wU3RyID0gXCIoXCIgKyB0bXBBcnIuam9pbihcIlwiKSArIFwiKVwiO1xuICAgICAgICByZWdRdWVyeSA9IG5ldyBSZWdFeHAodG1wU3RyKTtcblxuICAgICAgICBpZiAocmVnUXVlcnkudGVzdCh0ZXh0KSkge1xuICAgICAgICAgICAgcmV0dXJuU3RyID0gdGV4dC5yZXBsYWNlKHJlZ1F1ZXJ5LCAnPHN0cm9uZz4nICsgUmVnRXhwLiQxICsgJzwvc3Ryb25nPicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldHVyblN0cjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHRoZSBmaXJzdCByZXN1bHQgaXRlbVxuICAgICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0Rmlyc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JkZXJTdGFnZSh0aGlzLmZsb3dNYXAuRklSU1QpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGxhc3QgcmVzdWx0IGl0ZW1cbiAgICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2dldExhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JkZXJTdGFnZSh0aGlzLmZsb3dNYXAuTEFTVCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB3aGV0aGVyIGZpcnN0IG9yIGxhc3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBGaXJzdC9lbmQgZWxlbWVudCB0eXBlXG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb3JkZXJTdGFnZTogZnVuY3Rpb24odHlwZSkge1xuICAgICAgICB0eXBlID0gKHR5cGUgPT09IHRoaXMuZmxvd01hcC5GSVJTVCkgPyAnZmlyc3QnIDogJ2xhc3QnO1xuXG4gICAgICAgIGlmICh0aGlzLiRyZXN1bHRMaXN0ICYmXG4gICAgICAgICAgICB0aGlzLiRyZXN1bHRMaXN0LmNoaWxkcmVuKCkgJiZcbiAgICAgICAgICAgIHRoaXMuJHJlc3VsdExpc3QuY2hpbGRyZW4oKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiRyZXN1bHRMaXN0LmNoaWxkcmVuKClbdHlwZV0oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIG5leHQgZWxlbWVudCBmcm9tIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgKiBJZiBuZXh0IGVsZW1lbnQgaXMgbm90IGV4aXN0LCByZXR1cm4gZmlyc3QgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgZm9jdXNlZCBlbGVtZW50XG4gICAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9nZXROZXh0OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcmRlckVsZW1lbnQodGhpcy5mbG93TWFwLk5FWFQsIGVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gcHJldmlvdXMgZWxlbWVudCBmcm9tIHNlbGVjdGVkIGVsZW1lbnRcbiAgICAgKiBJZiBwcmV2aW91cyBlbGVtZW50IGlzIG5vdCBleGlzdCwgcmV0dXJuIHRoZSBsYXN0IGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IGZvY3VzZWQgZWxlbWVudFxuICAgICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfZ2V0UHJldjogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JkZXJFbGVtZW50KHRoaXMuZmxvd01hcC5QUkVWLCBlbGVtZW50KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0dXJuIHByZXZpb3VzIG9yIG5leHQgZWxlbWVudCBieSBkaXJlY3Rpb24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgVGhlIGRpcmVjdGlvbiB0eXBlIGZvciBmaW5kaW5nIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgZm9jdXNlZCBlbGVtZW50XG4gICAgICogQHJldHVybnMgeyp9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfb3JkZXJFbGVtZW50OiBmdW5jdGlvbih0eXBlLCBlbGVtZW50KSB7XG4gICAgICAgIGlmICghbmUudXRpbC5pc0V4aXN0eShlbGVtZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgJGN1cnJlbnQgPSAkKGVsZW1lbnQpLFxuICAgICAgICAgICAgaXNOZXh0ID0gKHR5cGUgPT09IHRoaXMuZmxvd01hcC5ORVhUKSxcbiAgICAgICAgICAgIG9yZGVyO1xuXG4gICAgICAgIGlmICgkY3VycmVudC5jbG9zZXN0KHRoaXMucmVzdWx0U2VsZWN0b3IpKSB7XG4gICAgICAgICAgICBvcmRlciA9IGlzTmV4dCA/IGVsZW1lbnQubmV4dCgpIDogZWxlbWVudC5wcmV2KCk7XG4gICAgICAgICAgICBpZiAob3JkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yZGVyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNOZXh0ID8gdGhpcy5fZ2V0Rmlyc3QoKSA6IHRoaXMuX2dldExhc3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgd2hldGhlciBhdXRvIGNvbXBsZXRlIHVzZSBvciBub3QgYW5kIGNoYW5nZSBzd2l0Y2gncyBzdGF0ZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF91c2VBdXRvQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaXNVc2UgPSB0aGlzLmF1dG9Db21wbGV0ZU9iai5pc1VzZUF1dG9Db21wbGV0ZSgpO1xuICAgICAgICB0aGlzLmNoYW5nZU9uT2ZmVGV4dChpc1VzZSk7XG4gICAgICAgIHRoaXMuYXV0b0NvbXBsZXRlT2JqLnNldENvb2tpZVZhbHVlKCFpc1VzZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgYXV0byBjb21wbGV0ZSBzd2l0Y2ggYXJlYVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3Nob3dCb3R0b21BcmVhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuJG9uT2ZmVHh0KSB7XG4gICAgICAgICAgICB0aGlzLiRvbk9mZlR4dC5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBhdXRvIGNvbXBsZXRlIHN3aXRjaCBhcmVhXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfaGlkZUJvdHRvbUFyZWE6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy4kb25PZmZUeHQpIHtcbiAgICAgICAgICAgIHRoaXMuJG9uT2ZmVHh0LmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2UgYWN0aW9uIGF0dHJpYnV0ZSBvZiBmb3JtIGVsZW1lbnQgYW5kIHNldCBhZGRpdGlvbiB2YWx1ZXMgaW4gaGlkZGVuIHR5cGUgZWxlbWVudHMuXG4gICAgICogQHBhcmFtIHtlbGVtZW50fSBbJHRhcmdldF0gU3VibWl0IG9wdGlvbnMgdGFyZ2V0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfc2V0U3VibWl0T3B0aW9uOiBmdW5jdGlvbigkdGFyZ2V0KSB7XG4gICAgICAgIHRoaXMuX2NsZWFyU3VibWl0T3B0aW9uKCk7XG5cbiAgICAgICAgdmFyIGZvcm1FbGVtZW50ID0gdGhpcy5vcHRpb25zLmZvcm1FbGVtZW50LFxuICAgICAgICAgICAgJHNlbGVjdEZpZWxkID0gJHRhcmdldCA/ICQoJHRhcmdldCkuY2xvc2VzdCgnbGknKSA6ICQodGhpcy5zZWxlY3RlZEVsZW1lbnQpLFxuICAgICAgICAgICAgYWN0aW9ucyA9IHRoaXMub3B0aW9ucy5hY3Rpb25zLFxuICAgICAgICAgICAgaW5kZXggPSAkc2VsZWN0RmllbGQuYXR0cignZGF0YS1pbmRleCcpLFxuICAgICAgICAgICAgY29uZmlnID0gdGhpcy5vcHRpb25zLmxpc3RDb25maWdbaW5kZXhdLFxuICAgICAgICAgICAgYWN0aW9uID0gYWN0aW9uc1tjb25maWcuYWN0aW9uXSxcbiAgICAgICAgICAgIHBhcmFtc1N0cmluZztcblxuICAgICAgICAkKGZvcm1FbGVtZW50KS5hdHRyKCdhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICBwYXJhbXNTdHJpbmcgPSAkc2VsZWN0RmllbGQuYXR0cignZGF0YS1wYXJhbXMnKTtcblxuICAgICAgICB0aGlzLmF1dG9Db21wbGV0ZU9iai5zZXRQYXJhbXMocGFyYW1zU3RyaW5nLCBpbmRleCk7XG5cbiAgICAgICAgdGhpcy5hdXRvQ29tcGxldGVPYmouZmlyZSgnY2hhbmdlJywge1xuICAgICAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICAgICAgYWN0aW9uOiBhY3Rpb24sXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1N0cmluZ1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgZm9ybSBlbGVtZW50LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX2NsZWFyU3VibWl0T3B0aW9uOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBmb3JtRWxlbWVudCA9IHRoaXMub3B0aW9ucy5mb3JtRWxlbWVudCxcbiAgICAgICAgICAgIGhpZGRlbldyYXAgPSAkKGZvcm1FbGVtZW50KS5maW5kKCcuaGlkZGVuLWlucHV0cycpO1xuXG4gICAgICAgIGhpZGRlbldyYXAuaHRtbCgnJyk7XG4gICAgfSxcblxuICAgIC8qKioqKioqKioqKioqKioqKioqKioqKioqIEV2ZW50IEhhbmRsZXJzICoqKioqKioqKioqKioqKioqKioqKi9cbiAgICAvKipcbiAgICAgKiBSZXN1bHQgbGlzdCBtb3VzZW92ZXIgZXZlbnQgaGFuZGxlclxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgRXZlbnQgaW5zdGFuc2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9vbk1vdXNlT3ZlcjogZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJHRhcmdldCA9ICQoZS50YXJnZXQpLFxuICAgICAgICAgICAgJGFyciA9IHRoaXMuJHJlc3VsdExpc3QuZmluZCgnbGknKSxcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9ICR0YXJnZXQuY2xvc2VzdCgnbGknKTtcblxuICAgICAgICBuZS51dGlsLmZvckVhY2hBcnJheSgkYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgICQodmFsKS5yZW1vdmVDbGFzcyh0aGlzLm1vdXNlT3ZlckNsYXNzKTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSAmJiBzZWxlY3RlZEl0ZW0uZmluZCgnLmtleXdvcmQtZmllbGQnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbS5hZGRDbGFzcyh0aGlzLm1vdXNlT3ZlckNsYXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2VsZWN0ZWRFbGVtZW50ID0gJHRhcmdldDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdWx0IGxpc3QgY2xpY2sgZXZuZXQgaGFuZGxlclxuICAgICAqIFN1Ym1pdCBmb3JtIGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtFdmVudH0gZSBFdmVudCBpbnN0YW5zZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX29uQ2xpY2s6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGUudGFyZ2V0KSxcbiAgICAgICAgICAgIGZvcm1FbGVtZW50ID0gdGhpcy5vcHRpb25zLmZvcm1FbGVtZW50LFxuICAgICAgICAgICAgJHNlbGVjdEZpZWxkID0gJHRhcmdldC5jbG9zZXN0KCdsaScpLFxuICAgICAgICAgICAgJGtleXdvcmRGaWVsZCA9ICRzZWxlY3RGaWVsZC5maW5kKCcua2V5d29yZC1maWVsZCcpLFxuICAgICAgICAgICAgc2VsZWN0ZWRLZXl3b3JkID0gJGtleXdvcmRGaWVsZC50ZXh0KCk7XG5cbiAgICAgICAgdGhpcy5hdXRvQ29tcGxldGVPYmouc2V0VmFsdWUoc2VsZWN0ZWRLZXl3b3JkKTtcblxuICAgICAgICBpZiAoZm9ybUVsZW1lbnQgJiYgc2VsZWN0ZWRLZXl3b3JkKSB7XG4gICAgICAgICAgICB0aGlzLl9zZXRTdWJtaXRPcHRpb24oJHRhcmdldCk7XG4gICAgICAgICAgICBmb3JtRWxlbWVudC5zdWJtaXQoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc3VsdE1hbmFnZXI7XG4iXX0=