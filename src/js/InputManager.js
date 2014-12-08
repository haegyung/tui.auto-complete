/**
 * @fileOverview 자동완성 컴포넌트의 InputManager
 * @author kihyun.lee@nhnent.com
 */

ne = window.ne || {};
ne.component = ne.component || {};


/**
 * 자동완성 컴포넌트의 구성 요소중 검색어 입력받는 입력창의 동작과 관련된 클래스
 *
 * @constructor
 */
ne.component.AutoComplete.InputManager = ne.util.defineClass(/**@lends ne.component.AutoComplete.InputManager.prototype */{

    keyCodeMap: {
        'TAB' : 9,
        'UP_ARROW' : 38,
        'DOWN_ARROW' : 40
    },

    init: function() {
        if (arguments.length != 2) {
            alert('argument length error !');
        }
        this.autoCompleteObj = arguments[0];
        this.options = arguments[1];

        //Config에서 검색창 부분에서 필요한 엘리먼트 정보 가져옴.
        this.$searchBox = this.options.searchBoxElement;
        this.$toggleBtn = this.options.toggleBtnElement;
        this.$orgQuery = this.options.orgQueryElement;

        //입력값 저장해두기
        this.inputValue = this.$searchBox.val();

        this._attachEvent();
    },


    /**
     * 검색창에 세팅된 키워드값을 리턴
     * @return {String} 검색창에 세팅된 키워드
     */
    getValue: function() {
        return this.$searchBox.val();
    },

    /**
     * 검색창에 키워드값 세팅
     * @param {String} str 검색창에 세팅할 키워드 값
     */
    setValue: function(str) {
        this.inputValue = str;
        this.$searchBox.val(str);
    },

    /**
     * on/off 토글버튼 이미지를 변경한다.
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
     * 이벤트 바인딩 함수
     * @private
     */
    _attachEvent: function() {
        //검색창에 focus, keyup, keydown, click 이벤트 바인딩.
        this.$searchBox.bind('focus keyup keydown blur click', $.proxy(function(e) {
            if (e.type === 'focus') {
                this._onFocus(e);
            } else if (e.type === 'blur') {
                this._onBlur(e);
            } else if (e.type === 'keyup') {
                this._onKeyUp(e);
            } else if (e.type === 'keydown') {
                this._onKeyDown(e);
            } else if (e.type === 'click') {
                this._onClick();
            }
        }, this));

        if (this.$toggleBtn) {
            this.$toggleBtn.bind('click', $.proxy(function(e) {
                this._onClickToggle();
            }, this));
        }
    },

    /**
     * 사용자가 입력했던 원본 쿼리값을 html hidden value로 세팅한다.
     *
     * @param {String} str 사용자가 검색창에 입력한 검색어 스트링.
     * @private
     */
    _setOrgQuery: function(str) {
        this.$orgQuery.val(str);
    },

    /**************************** Event Handlers *****************************/
    /**
     * 검색창이 click되었을 때 실행되는 이벤트 핸들러 함수
     * @private
     */
    _onClick: function() {
        //입력된 키워드가 없거나 자동완성 기능 사용하지 않으면 펼칠 필요 없으므로 무효. 그냥 리턴하고 끝.
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
     * 검색창에 focus 되었을때 실행되는 이벤트 핸들러 함수
     * @private
     */
    _onFocus: function(e) {
        //setInterval 설정해서 일정 시간 주기로 _onWatch 함수를 실행한다.

        var self = this;
        this.intervalId = setInterval($.proxy(function() {
            self._onWatch();
        }), this, 200);
    },

    /**
     * 검색창의 입력값 변경 여부를 판단.
     * @private
     */
    _onWatch: function() {
        //입력창에 입력된 값이 없으면 orgQueryElement 의 값도 초기화한다.
        if (this.$searchBox.val() === '') {
            this._setOrgQuery('');
            this.autoCompleteObj.setMoved(false);
        }

        //입력값에 변경이 생겼다면 ([예] 운 --> 운동 --> 운동화) 서버에 데이터 요청하도록 한다.
        if (this.inputValue != this.$searchBox.val()) {
            this.inputValue = this.$searchBox.val();
            this._onChange();
        } else if (!this.autoCompleteObj.getMoved()) {
            this._setOrgQuery(this.$searchBox.val());
        }
    },

    /**
     * 검색창이 keyup되었을때 실행되는 이벤트 핸들러 함수
     * @private
     */
    _onKeyUp: function() {
        //입력값에 변경이 생겼다면 ( 소녀 --> 소녀시 --> 소녀시대 )
        //_onChange함수를 통해 서버에 데이터 요청하도록 한다.

        if (this.inputValue != this.$searchBox.val()) {
            this.inputValue = this.$searchBox.val();
            this._onChange();
        }
    },

    /**
     * 검색어 입력창의 입력값에 변화가 생겼을 때 실행되는 함수
     * DataManager에 변경된 검색어를 전송하여 서버로 request하도록 한다.
     * @private
     */
    _onChange: function() {
        if (!this.autoCompleteObj.isUseAutoComplete()) {
            return;
        }

        this.autoCompleteObj.request(this.$searchBox.val());
    },

    /**
     * 검색창의 blur이벤트 처리하는 핸들러
     * @private
     */
    _onBlur: function() {
        //onFocus에서 설정했던 setInterval함수 해제
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },

    /**
     * 검색창 keydown event 처리 핸들러
     * @param {Event} keyDown 이벤트 객체
     * @private
     */
    _onKeyDown: function(e) {
        if (!this.autoCompleteObj.isUseAutoComplete() ||
            !this.autoCompleteObj.isVisibleResult()) {
            return;
        }

        //입력키값(TAB,방향키)에 따른 액션 정의
        if (e.keyCode == this.keyCodeMap.TAB) {
            e.preventDefault();

            if (e.shiftKey) {
                this.autoCompleteObj.movePrevKeyword(e);
            } else {
                this.autoCompleteObj.moveNextKeyword(e);
            }
        } else if (e.keyCode == this.keyCodeMap.DOWN_ARROW) {
            this.autoCompleteObj.moveNextKeyword(e);
        } else if (e.keyCode == this.keyCodeMap.UP_ARROW) {
            this.autoCompleteObj.movePrevKeyword(e);
        }
    },


    /**
     * 토글버튼 click event 처리
     * @private
     */
    _onClickToggle: function() {
        if (!this.autoCompleteObj.isUseAutoComplete()) {
            //자동완성 끄기 상태일 때 : off 버튼 클릭하면 on버튼으로 바꾸고 자동완성 기능 켜기.

            //on버튼으로 바꾸기
            this.setToggleBtnImg(true);

            //자동완성 기능 켜기 (cookie설정)
            this.autoCompleteObj.setCookieValue(true);

            //텍스트를 [자동완성 끄기] 로 설정하기
            this.autoCompleteObj.changeOnOffText(false);
        } else {
            //자동완성 켜기 상태일 때 : on 버튼 클릭하면 off버튼으로 바꾸고 자동완성 기능 끄기.

            this.autoCompleteObj.hideResultList();

            this.setToggleBtnImg(false);
            this.autoCompleteObj.setCookieValue(false);
            this.autoCompleteObj.changeOnOffText(true);
        }
    }
});