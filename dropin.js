'use strict';

var assign = require('./lib/assign').assign;
var analytics = require('./lib/analytics');
var classList = require('@braintree/class-list');
var constants = require('./constants');
var DropinError = require('./lib/dropin-error');
var DropinModel = require('./dropin-model');
var EventEmitter = require('@braintree/event-emitter');
var assets = require('@braintree/asset-loader');

var MainView = require('./views/main-view');
var paymentMethodsViewID = require('./views/payment-methods-view').ID;
var paymentOptionIDs = constants.paymentOptionIDs;
var translations = require('./translations').translations;
var isUtf8 = require('./lib/is-utf-8');
var uuid = require('@braintree/uuid');
var Promise = require('./lib/promise');
var sanitizeHtml = require('./lib/sanitize-html');
var DataCollector = require('./lib/data-collector');
var ThreeDSecure = require('./lib/three-d-secure');
var wrapPrototype = require('@braintree/wrap-promise').wrapPrototype;

var mainHTML = "<div class=\"braintree-dropin\">\r\n    <div data-braintree-id=\"methods-label\" class=\"braintree-heading\">&nbsp;</div>\r\n    <div data-braintree-id=\"methods-edit\"\r\n         class=\"braintree-hidden braintree-heading\"\r\n         role=\"button\"\r\n         tabindex=\"0\">{{edit}}\r\n    </div>\r\n    <div data-braintree-id=\"choose-a-way-to-pay\">{{chooseAWayToPay}}</div>\r\n    <div class=\"braintree-placeholder\">&nbsp;</div>\r\n\r\n    <div data-braintree-id=\"upper-container\" class=\"braintree-upper-container\">\r\n        <div data-braintree-id=\"loading-container\" class=\"optimizedCheckout-form-checklist-item--selected braintree-loader__container\">\r\n            <div data-braintree-id=\"loading-indicator\" class=\"braintree-loader__indicator\">\r\n                <svg width=\"14\" height=\"16\" class=\"braintree-loader__lock\">\r\n                    <use xlink:href=\"#iconLockLoader\"></use>\r\n                </svg>\r\n            </div>\r\n        </div>\r\n\r\n        <div data-braintree-id=\"delete-confirmation\"\r\n             class=\"braintree-delete-confirmation braintree-sheet\">\r\n            <div data-braintree-id=\"delete-confirmation__message\"></div>\r\n            <div class=\"braintree-delete-confirmation__button-container\">\r\n                <div tabindex=\"0\"\r\n                     role=\"button\"\r\n                     data-braintree-id=\"delete-confirmation__no\"\r\n                     class=\"braintree-delete-confirmation__button\">{{deleteCancelButton}}\r\n                </div>\r\n                <div tabindex=\"0\"\r\n                     role=\"button\"\r\n                     data-braintree-id=\"delete-confirmation__yes\"\r\n                     class=\"braintree-delete-confirmation__button\">{{deleteConfirmationButton}}\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <div data-braintree-id=\"methods\" class=\"braintree-methods braintree-methods-initial\">\r\n            <div data-braintree-id=\"methods-container\"></div>\r\n        </div>\r\n\r\n        <div data-braintree-id=\"options\"\r\n             class=\"braintree-test-class braintree-options braintree-options-initial\">\r\n            <div data-braintree-id=\"payment-options-container\" class=\"braintree-options-list\"></div>\r\n        </div>\r\n\r\n        <div data-braintree-id=\"sheet-container\" class=\"braintree-sheet__container\">\r\n            <div data-braintree-id=\"paypal\" class=\"optimizedCheckout-form-checklist-item--selected braintree-paypal braintree-sheet\">\r\n                <div data-braintree-id=\"paypal-sheet-header\" class=\"braintree-sheet__header\">\r\n                    <div class=\"braintree-sheet__header-label\">\r\n                        <div class=\"braintree-sheet__logo--header\">\r\n                            <svg width=\"40\" height=\"24\">\r\n                                <use xlink:href=\"#logoPayPal\"></use>\r\n                            </svg>\r\n                        </div>\r\n                        <div class=\"braintree-sheet__label\">{{PayPal}}</div>\r\n                    </div>\r\n                </div>\r\n                <div class=\"braintree-sheet__content braintree-sheet__content--button\">\r\n                    <div data-braintree-id=\"paypal-button\"\r\n                         class=\"braintree-sheet__button--paypal\"></div>\r\n                </div>\r\n            </div>\r\n            <div data-braintree-id=\"paypalCredit\" class=\"optimizedCheckout-form-checklist-item--selected braintree-paypalCredit braintree-sheet\">\r\n                <div data-braintree-id=\"paypal-credit-sheet-header\" class=\"braintree-sheet__header\">\r\n                    <div class=\"braintree-sheet__header-label\">\r\n                        <div class=\"braintree-sheet__logo--header\">\r\n                            <svg width=\"40\" height=\"24\">\r\n                                <use xlink:href=\"#logoPayPalCredit\"></use>\r\n                            </svg>\r\n                        </div>\r\n                        <div class=\"braintree-sheet__label\">{{PayPal Credit}}</div>\r\n                    </div>\r\n                </div>\r\n                <div class=\"braintree-sheet__content braintree-sheet__content--button\">\r\n                    <div data-braintree-id=\"paypal-credit-button\"\r\n                         class=\"braintree-sheet__button--paypal\"></div>\r\n                </div>\r\n            </div>\r\n            <div data-braintree-id=\"applePay\" class=\"optimizedCheckout-form-checklist-item--selected braintree-applePay braintree-sheet\">\r\n                <div data-braintree-id=\"apple-pay-sheet-header\" class=\"braintree-sheet__header\">\r\n                    <div class=\"braintree-sheet__header-label\">\r\n                        <div class=\"braintree-sheet__logo--header\">\r\n                            <svg height=\"24\" width=\"40\">\r\n                                <use xlink:href=\"#logoApplePay\"></use>\r\n                            </svg>\r\n                        </div>\r\n                        <div class=\"braintree-sheet__label\">{{Apple Pay}}</div>\r\n                    </div>\r\n                </div>\r\n                <div class=\"braintree-sheet__content braintree-sheet__content--button\">\r\n                    <div data-braintree-id=\"apple-pay-button\"\r\n                         class=\"braintree-sheet__button--apple-pay apple-pay-button\"></div>\r\n                </div>\r\n            </div>\r\n            <div data-braintree-id=\"googlePay\" class=\"optimizedCheckout-form-checklist-item--selected braintree-googlePay braintree-sheet\">\r\n                <div data-braintree-id=\"google-pay-sheet-header\" class=\"braintree-sheet__header\">\r\n                    <div class=\"braintree-sheet__header-label\">\r\n                        <div class=\"braintree-sheet__logo--header\">\r\n                            <svg height=\"24\" width=\"40\">\r\n                                <use xlink:href=\"#logoGooglePay\"></use>\r\n                            </svg>\r\n                        </div>\r\n                        <div class=\"braintree-sheet__label\">{{Google Pay}}</div>\r\n                    </div>\r\n                </div>\r\n                <div class=\"braintree-sheet__content braintree-sheet__content--button\">\r\n                    <div data-braintree-id=\"google-pay-button\"></div>\r\n                </div>\r\n            </div>\r\n            <div data-braintree-id=\"venmo\" class=\"optimizedCheckout-form-checklist-item--selected braintree-venmo braintree-sheet\">\r\n                <div data-braintree-id=\"venmo-sheet-header\" class=\"braintree-sheet__header\">\r\n                    <div class=\"braintree-sheet__header-label\">\r\n                        <div class=\"braintree-sheet__logo--header\">\r\n                            <svg height=\"24\" width=\"40\">\r\n                                <use xlink:href=\"#logoVenmo\"></use>\r\n                            </svg>\r\n                        </div>\r\n                        <div class=\"braintree-sheet__label\">{{Venmo}}</div>\r\n                    </div>\r\n                </div>\r\n                <div class=\"braintree-sheet__content braintree-sheet__content--button\">\r\n                    <svg data-braintree-id=\"venmo-button\" class=\"braintree-sheet__button--venmo\">\r\n                        <use xlink:href=\"#buttonVenmo\"></use>\r\n                    </svg>\r\n                </div>\r\n            </div>\r\n            <div data-braintree-id=\"card\"\r\n                 class=\"optimizedCheckout-form-checklist-item--selected braintree-card braintree-form braintree-sheet\">\r\n                <div class=\"form-checklist-header form-checklist-header--selected\">\r\n                    <div class=\"form-field\"><input name=\"paymentProviderRadio\"\r\n                                                   class=\"form-checklist-checkbox optimizedCheckout-form-checklist-checkbox\"\r\n                                                   id=\"radio-braintree\"\r\n                                                   type=\"radio\"\r\n                                                   value=\"braintree\"\r\n                                                   checked=\"\"><label for=\"radio-braintree\"\r\n                                                                     class=\"form-label optimizedCheckout-form-label\"><span\r\n                            class=\"paymentProviderHeader-name\"\r\n                            data-test=\"payment-method-name\">{{payWithCard}}</span>\r\n                        <div data-braintree-id=\"card-sheet-header\" class=\"braintree-sheet__header paymentProviderHeader-cc\">\r\n                            <div data-braintree-id=\"card-view-icons\" class=\"braintree-sheet__icons\"></div>\r\n                        </div>\r\n                    </label></div>\r\n                </div>\r\n                <div class=\"braintree-sheet__content braintree-sheet__content--form form-checklist-body\">\r\n                    <div class=\"braintree-form__flexible-fields\">\r\n                        <div id=\"braintree-form__number-field-group\" data-braintree-id=\"number-field-group\"\r\n                             class=\"braintree-form__field-group\">\r\n                            <label>\r\n                                <div class=\"form-label optimizedCheckout-form-label\">\r\n                                    {{cardNumberLabel}}\r\n                                </div>\r\n                                <div class=\"braintree-form__field\">\r\n                                    <div class=\"braintree-form-number braintree-form__hosted-field form-input optimizedCheckout-form-input\"></div>\r\n                                    <div class=\"braintree-form__icon-container\">\r\n                                        <div data-braintree-id=\"card-number-icon\"\r\n                                             class=\"braintree-form__icon braintree-form__field-secondary-icon\">\r\n                                            <svg width=\"40\"\r\n                                                 height=\"24\"\r\n                                                 class=\"braintree-icon--bordered\">\r\n                                                <use data-braintree-id=\"card-number-icon-svg\"\r\n                                                     xlink:href=\"#iconCardFront\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                        <div class=\"braintree-form__icon braintree-form__field-error-icon\">\r\n                                            <svg width=\"24\" height=\"24\">\r\n                                                <use xlink:href=\"#iconError\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                    </div>\r\n                                </div>\r\n                            </label>\r\n                            <div data-braintree-id=\"number-field-error\"\r\n                                 class=\"braintree-form__field-error\"></div>\r\n                        </div>\r\n                        <div id=\"braintree-form__expiration-date-field-group\" data-braintree-id=\"expiration-date-field-group\"\r\n                             class=\"braintree-form__field-group\">\r\n                            <label>\r\n                                <div class=\"form-label optimizedCheckout-form-label\">\r\n                                    {{expirationDateLabel}}\r\n                                </div>\r\n                                <div class=\"braintree-form__field\">\r\n                                    <div class=\"braintree-form__hosted-field braintree-form-expiration form-input optimizedCheckout-form-input\"></div>\r\n                                    <div class=\"braintree-form__icon-container\">\r\n                                        <div class=\"braintree-form__icon braintree-form__field-error-icon\">\r\n                                            <svg width=\"24\" height=\"24\">\r\n                                                <use xlink:href=\"#iconError\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                    </div>\r\n                                </div>\r\n                            </label>\r\n                            <div data-braintree-id=\"expiration-date-field-error\"\r\n                                 class=\"braintree-form__field-error\"></div>\r\n                        </div>\r\n                    </div>\r\n\r\n\r\n                    <div class=\"braintree-form__flexible-fields\">\r\n                        <div id=\"braintree-form__cardholder-name-field-group\" data-braintree-id=\"cardholder-name-field-group\"\r\n                             class=\"braintree-form__field-group\">\r\n                            <label for=\"braintree__card-view-input__cardholder-name\">\r\n                                <div class=\"form-label optimizedCheckout-form-label\">\r\n                                    {{cardholderNameLabel}}\r\n                                </div>\r\n                                <div class=\"braintree-form__field\">\r\n                                    <div class=\"braintree-form-cardholder-name braintree-form__hosted-field form-input optimizedCheckout-form-input\"></div>\r\n                                    <div class=\"braintree-form__icon-container\">\r\n                                        <div class=\"braintree-form__icon braintree-form__field-error-icon\">\r\n                                            <svg width=\"24\" height=\"24\">\r\n                                                <use xlink:href=\"#iconError\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                    </div>\r\n                                </div>\r\n                            </label>\r\n                            <div data-braintree-id=\"cardholder-name-field-error\"\r\n                                 class=\"braintree-form__field-error\"></div>\r\n                        </div>\r\n\r\n\r\n                        <div id=\"braintree-form__cvv-field-group\" data-braintree-id=\"cvv-field-group\"\r\n                             class=\"braintree-form__field-group\" >\r\n                            <label>\r\n                                <div class=\"form-label optimizedCheckout-form-label\">{{cvvLabel}}\r\n                                    <span>\r\n                                        <span class=\"has-tip\"><div class=\"icon\"><svg height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z\"></path></svg></div></span>\r\n                                        <div class=\"has-tip__message\"><div class=\"dropdown-menu dropdown-menu--content dropdown-menu--card-code\"><div class=\"form-ccFields-cvvExample\"><div class=\"form-ccFields-cvvExampleDescription\"><p>For VISA and Mastercard, the CVV is a three-digit code printed on the back. For American Express it is the four-digit code printed on the front. The CVV is a security measure to ensure that you are in possession of the card.</p></div><div class=\"form-ccFields-cvvExampleFigures\"><figure><div class=\"icon icon--large\"><svg height=\"54\" viewBox=\"0 0 88 54\" width=\"88\" xmlns=\"http://www.w3.org/2000/svg\"><title>CVV visa, mc, disc</title><g fill=\"none\" fill-rule=\"evenodd\"><rect fill=\"#DEDEDE\" height=\"54\" rx=\"3\" width=\"88\"></rect><path d=\"M0 5h88v12H0z\" fill=\"#838383\"></path><path d=\"M3 23h82v10H3z\" fill=\"#FFF\"></path><path d=\"M69.81 29.053c.015.297.13.502.343.616.11.058.233.088.37.088.258 0 .477-.107.66-.32.18-.215.31-.65.384-1.306-.12.19-.267.322-.444.4-.176.076-.366.114-.57.114-.412 0-.74-.13-.98-.386-.24-.257-.36-.588-.36-.993 0-.388.12-.73.357-1.025.237-.295.587-.443 1.05-.443.623 0 1.054.28 1.29.842.133.31.2.696.2 1.16 0 .525-.08.99-.238 1.394-.26.674-.703 1.01-1.327 1.01-.42 0-.737-.11-.954-.328-.217-.22-.325-.494-.325-.825h.544zm1.4-1.09c.176-.14.265-.387.265-.737 0-.315-.08-.55-.238-.705-.16-.153-.36-.23-.606-.23-.262 0-.47.088-.625.264-.155.177-.232.412-.232.707 0 .28.068.502.203.667.136.164.352.246.65.246.213 0 .408-.07.584-.21zm3.414-.563c.133-.132.2-.29.2-.474 0-.16-.064-.306-.19-.44-.13-.133-.323-.2-.585-.2-.26 0-.447.067-.563.2-.115.134-.173.29-.173.47 0 .202.075.36.224.473.15.112.326.17.53.17.237 0 .422-.067.556-.2zm.097 2.118c.165-.135.247-.336.247-.603 0-.277-.084-.487-.254-.63-.17-.144-.386-.216-.652-.216-.256 0-.466.072-.628.22-.163.145-.244.348-.244.607 0 .223.074.416.223.58.15.16.38.243.69.243.25 0 .456-.068.62-.202zm-1.735-1.937c-.158-.158-.236-.365-.236-.62 0-.32.114-.594.345-.823.232-.23.56-.344.984-.344.41 0 .732.108.965.325.233.216.35.47.35.758 0 .267-.068.483-.203.65-.076.092-.194.184-.353.274.176.08.316.175.418.28.19.2.284.46.284.778 0 .377-.127.697-.38.96-.253.26-.61.392-1.074.392-.416 0-.77-.113-1.057-.34-.287-.226-.43-.554-.43-.985 0-.253.06-.472.184-.656.124-.186.307-.327.55-.424-.15-.064-.265-.14-.35-.225zm5.614-1.42c.188.248.282.503.282.766h-.532c-.032-.17-.083-.302-.153-.397-.13-.18-.326-.27-.59-.27-.3 0-.54.14-.717.417-.177.278-.276.676-.296 1.194.124-.18.28-.316.467-.405.172-.08.364-.12.575-.12.36 0 .672.115.94.344.266.228.4.57.4 1.025 0 .388-.127.733-.38 1.033-.253.3-.614.45-1.083.45-.4 0-.746-.152-1.037-.456-.29-.304-.437-.816-.437-1.536 0-.532.065-.983.194-1.354.25-.71.705-1.065 1.367-1.065.478 0 .81.124 1 .372zm-.404 3.274c.14-.19.21-.415.21-.674 0-.22-.062-.43-.188-.627-.126-.198-.354-.297-.685-.297-.23 0-.434.076-.608.23-.175.153-.262.385-.262.694 0 .27.08.498.238.683.16.184.38.277.66.277.283 0 .495-.096.636-.286z\" fill=\"#636363\"></path><rect height=\"18\" rx=\"40\" stroke=\"#ED6A6A\" stroke-width=\"2\" width=\"18\" x=\"65\" y=\"19\"></rect></g></svg></div></figure><figure><div class=\"icon icon--large\"><svg height=\"54\" viewBox=\"0 0 88 54\" width=\"88\" xmlns=\"http://www.w3.org/2000/svg\"><title>CVV amex</title><g fill=\"none\" fill-rule=\"evenodd\"><rect fill=\"#DEDEDE\" height=\"54\" rx=\"3\" width=\"88\"></rect><text fill=\"#979BA1\" font-family=\"Avenir Next\" font-size=\"6\" font-weight=\"420\" letter-spacing=\".2\"><tspan x=\"11\" y=\"35\">3712 567890 374</tspan><tspan x=\"70.21\" y=\"35\">5</tspan></text><path d=\"M69.182 26.767h-.55v-3.35l-.762.635-.324-.38 1.142-.926h.494v4.02zm4.19 0H70.75v-.528l1.6-1.59c.122-.126.226-.257.313-.393s.13-.29.13-.46c0-.106-.018-.202-.056-.287-.038-.085-.09-.158-.153-.22-.065-.06-.14-.106-.228-.138-.087-.032-.18-.048-.278-.048-.204 0-.373.065-.505.196-.133.13-.216.298-.25.503l-.54-.09c.023-.153.07-.294.145-.424.074-.132.168-.246.28-.342.115-.097.246-.17.396-.224.15-.053.31-.08.48-.08.166 0 .326.025.48.074.153.05.288.12.406.216.117.094.21.214.28.357.07.145.106.31.106.496 0 .128-.017.248-.05.357-.035.11-.082.214-.14.313-.06.098-.128.192-.208.28-.08.09-.162.178-.25.265l-1.306 1.273h1.97v.494zm1.625-2.328h.176c.114 0 .225-.012.333-.033.107-.02.203-.056.286-.107.084-.052.15-.12.202-.208.05-.087.077-.195.077-.323 0-.104-.018-.196-.056-.277-.038-.08-.09-.15-.156-.207-.067-.057-.142-.102-.227-.134-.085-.032-.175-.048-.27-.048-.17 0-.314.044-.434.13-.12.088-.21.21-.27.364l-.5-.176c.1-.242.257-.433.475-.57.22-.14.47-.208.753-.208.167 0 .325.024.475.07.15.048.28.117.394.208.114.09.204.205.27.34.066.137.1.294.1.472 0 .114-.018.22-.054.318-.036.1-.086.188-.148.267-.063.08-.137.147-.224.204-.087.057-.182.098-.284.125v.01c.117.023.226.063.326.12.1.056.187.127.26.212.07.086.127.183.17.293.04.11.06.23.06.358 0 .2-.036.377-.112.53-.076.154-.176.282-.3.384-.126.102-.27.18-.433.233-.163.053-.33.08-.5.08-.318 0-.598-.073-.84-.216-.242-.144-.418-.368-.528-.67l.51-.17c.06.173.165.315.31.425.146.11.325.164.537.164.102 0 .202-.016.298-.05.097-.03.183-.08.26-.143.074-.064.135-.143.18-.238.046-.095.07-.206.07-.335 0-.14-.032-.257-.092-.352-.06-.095-.14-.17-.236-.23-.097-.06-.205-.1-.327-.125-.12-.025-.24-.037-.357-.037h-.17v-.454zm4.73.953h.58v.47h-.58v.904h-.533v-.903h-1.85v-.5l1.708-2.618h.676v2.647zm-.533-2.016h-.01l-1.273 2.016h1.284v-2.016z\" fill=\"#636363\" opacity=\".9\"></path><rect height=\"18\" rx=\"40\" stroke=\"#ED6A6A\" stroke-width=\"2\" width=\"18\" x=\"65\" y=\"16\"></rect></g></svg></div></figure></div></div></div></div>\r\n                                    </span>\r\n                                </div>\r\n                                <div class=\"braintree-form__field\">\r\n                                    <div class=\"braintree-form__hosted-field braintree-form-cvv form-input optimizedCheckout-form-input\"></div>\r\n                                    <div class=\"braintree-form__icon-container\">\r\n                                        <div data-braintree-id=\"cvv-icon\"\r\n                                             class=\"braintree-form__icon braintree-form__field-secondary-icon\">\r\n                                            <svg width=\"40\"\r\n                                                 height=\"24\"\r\n                                                 class=\"braintree-icon--bordered\">\r\n                                                <use data-braintree-id=\"cvv-icon-svg\"\r\n                                                     xlink:href=\"#iconCVVBack\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                        <div class=\"braintree-form__icon braintree-form__field-error-icon\">\r\n                                            <svg width=\"24\" height=\"24\">\r\n                                                <use xlink:href=\"#iconError\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                    </div>\r\n                                </div>\r\n                            </label>\r\n                            <div data-braintree-id=\"cvv-field-error\"\r\n                                 class=\"braintree-form__field-error\"></div>\r\n                        </div>\r\n\r\n                        <div id=\"braintree-form__postal-code-field-group\" data-braintree-id=\"postal-code-field-group\"\r\n                             class=\"braintree-form__field-group\">\r\n                            <label>\r\n                                <div class=\"form-label optimizedCheckout-form-label\">\r\n                                    {{postalCodeLabel}}\r\n                                </div>\r\n                                <div class=\"braintree-form__field\">\r\n                                    <div class=\"braintree-form__hosted-field braintree-form-postal-code form-input optimizedCheckout-form-input\"></div>\r\n                                    <div class=\"braintree-form__icon-container\">\r\n                                        <div class=\"braintree-form__icon braintree-form__field-error-icon\">\r\n                                            <svg width=\"24\" height=\"24\">\r\n                                                <use xlink:href=\"#iconError\"></use>\r\n                                            </svg>\r\n                                        </div>\r\n                                    </div>\r\n                                </div>\r\n                            </label>\r\n                            <div data-braintree-id=\"postal-code-field-error\"\r\n                                 class=\"braintree-form__field-error\"></div>\r\n                        </div>\r\n                    </div>\r\n\r\n                    <div data-braintree-id=\"save-card-field-group\"\r\n                         class=\"braintree-form__field-group braintree-hidden\">\r\n                        <label>\r\n                            <div class=\"braintree-form__field braintree-form__checkbox\">\r\n                                <input type=\"checkbox\"\r\n                                       data-braintree-id=\"save-card-input\"\r\n                                       checked />\r\n                            </div>\r\n                            <div class=\"form-label optimizedCheckout-form-label\">{{saveCardLabel}}\r\n                            </div>\r\n                        </label>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n\r\n            <div data-braintree-id=\"sheet-error\" class=\"braintree-sheet__error\">\r\n                <div class=\"braintree-form__icon braintree-sheet__error-icon\">\r\n                    <svg width=\"24\" height=\"24\">\r\n                        <use xlink:href=\"#iconError\"></use>\r\n                    </svg>\r\n                </div>\r\n                <div data-braintree-id=\"sheet-error-text\" class=\"braintree-sheet__error-text\"></div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n    <div data-braintree-id=\"lower-container\"\r\n         class=\"braintree-test-class braintree-options braintree-hidden\">\r\n        <div data-braintree-id=\"other-ways-to-pay\" class=\"braintree-heading\">{{otherWaysToPay}}\r\n        </div>\r\n    </div>\r\n\r\n    <div data-braintree-id=\"toggle\"\r\n         class=\"button optimizedCheckout-buttonSecondary braintree-large-button braintree-toggle braintree-hidden\"\r\n         tabindex=\"0\"\r\n         role=\"button\">\r\n        <span>{{chooseAnotherWayToPay}}</span>\r\n    </div>\r\n</div>\r\n<div data-braintree-id=\"disable-wrapper\" class=\"braintree-dropin__disabled braintree-hidden\"></div>\r\n";
var svgHTML = "<svg data-braintree-id=\"svgs\">\r\n  <defs>\r\n    <symbol id=\"icon-visa\" viewBox=\"0 0 40 24\">\r\n      <title>Visa</title>\r\n      <path d=\"M0 1.927C0 .863.892 0 1.992 0h36.016C39.108 0 40 .863 40 1.927v20.146C40 23.137 39.108 24 38.008 24H1.992C.892 24 0 23.137 0 22.073V1.927z\" fill=\"#FFF\" />\r\n      <path d=\"M0 22.033C0 23.12.892 24 1.992 24h36.016c1.1 0 1.992-.88 1.992-1.967V20.08H0v1.953z\" fill=\"#F8B600\" />\r\n      <path d=\"M0 3.92h40V1.967C40 .88 39.108 0 38.008 0H1.992C.892 0 0 .88 0 1.967V3.92zM19.596 7.885l-2.11 9.478H14.93l2.11-9.478h2.554zm10.743 6.12l1.343-3.56.773 3.56H30.34zm2.85 3.358h2.36l-2.063-9.478H31.31c-.492 0-.905.274-1.088.695l-3.832 8.783h2.682l.532-1.415h3.276l.31 1.415zm-6.667-3.094c.01-2.502-3.6-2.64-3.577-3.76.008-.338.345-.7 1.083-.793.365-.045 1.373-.08 2.517.425l.448-2.01c-.615-.214-1.405-.42-2.39-.42-2.523 0-4.3 1.288-4.313 3.133-.016 1.364 1.268 2.125 2.234 2.58.996.464 1.33.762 1.325 1.177-.006.636-.793.918-1.526.928-1.285.02-2.03-.333-2.623-.6l-.462 2.08c.598.262 1.7.49 2.84.502 2.682 0 4.437-1.273 4.445-3.243zM15.948 7.884l-4.138 9.478h-2.7L7.076 9.8c-.123-.466-.23-.637-.606-.834-.615-.32-1.63-.62-2.52-.806l.06-.275h4.345c.554 0 1.052.354 1.178.966l1.076 5.486 2.655-6.45h2.683z\" fill=\"#1A1F71\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-master-card\" viewBox=\"0 0 40 24\">\r\n      <title>MasterCard</title>\r\n      <path d=\"M0 1.927C0 .863.892 0 1.992 0h36.016C39.108 0 40 .863 40 1.927v20.146C40 23.137 39.108 24 38.008 24H1.992C.892 24 0 23.137 0 22.073V1.927z\" fill=\"#FFF\" />\r\n      <path d=\"M11.085 22.2v-1.36c0-.522-.318-.863-.864-.863-.272 0-.568.09-.773.386-.16-.25-.386-.386-.727-.386-.228 0-.455.068-.637.318v-.272h-.478V22.2h.478v-1.202c0-.386.204-.567.523-.567.318 0 .478.205.478.568V22.2h.477v-1.202c0-.386.23-.567.524-.567.32 0 .478.205.478.568V22.2h.523zm7.075-2.177h-.774v-.658h-.478v.658h-.432v.43h.432v.998c0 .5.205.795.75.795.206 0 .433-.068.592-.16l-.136-.407c-.136.09-.296.114-.41.114-.227 0-.318-.137-.318-.363v-.976h.774v-.43zm4.048-.046c-.273 0-.454.136-.568.318v-.272h-.478V22.2h.478v-1.225c0-.363.16-.567.455-.567.09 0 .204.023.295.046l.137-.454c-.09-.023-.228-.023-.32-.023zm-6.118.227c-.228-.16-.546-.227-.888-.227-.546 0-.91.272-.91.703 0 .363.274.567.75.635l.23.023c.25.045.385.113.385.227 0 .16-.182.272-.5.272-.32 0-.57-.113-.728-.227l-.228.363c.25.18.59.272.932.272.637 0 1-.295 1-.703 0-.385-.295-.59-.75-.658l-.227-.022c-.205-.023-.364-.068-.364-.204 0-.16.16-.25.41-.25.272 0 .545.114.682.182l.205-.386zm12.692-.227c-.273 0-.455.136-.568.318v-.272h-.478V22.2h.478v-1.225c0-.363.16-.567.455-.567.09 0 .203.023.294.046L29.1 20c-.09-.023-.227-.023-.318-.023zm-6.096 1.134c0 .66.455 1.135 1.16 1.135.32 0 .546-.068.774-.25l-.228-.385c-.182.136-.364.204-.57.204-.385 0-.658-.272-.658-.703 0-.407.273-.68.66-.702.204 0 .386.068.568.204l.228-.385c-.228-.182-.455-.25-.774-.25-.705 0-1.16.477-1.16 1.134zm4.413 0v-1.087h-.48v.272c-.158-.204-.385-.318-.68-.318-.615 0-1.093.477-1.093 1.134 0 .66.478 1.135 1.092 1.135.317 0 .545-.113.68-.317v.272h.48v-1.09zm-1.753 0c0-.384.25-.702.66-.702.387 0 .66.295.66.703 0 .387-.273.704-.66.704-.41-.022-.66-.317-.66-.703zm-5.71-1.133c-.636 0-1.09.454-1.09 1.134 0 .682.454 1.135 1.114 1.135.32 0 .638-.09.888-.295l-.228-.34c-.18.136-.41.227-.636.227-.296 0-.592-.136-.66-.522h1.615v-.18c.022-.704-.388-1.158-1.002-1.158zm0 .41c.297 0 .502.18.547.52h-1.137c.045-.295.25-.52.59-.52zm11.852.724v-1.95h-.48v1.135c-.158-.204-.385-.318-.68-.318-.615 0-1.093.477-1.093 1.134 0 .66.478 1.135 1.092 1.135.318 0 .545-.113.68-.317v.272h.48v-1.09zm-1.752 0c0-.384.25-.702.66-.702.386 0 .66.295.66.703 0 .387-.274.704-.66.704-.41-.022-.66-.317-.66-.703zm-15.97 0v-1.087h-.476v.272c-.16-.204-.387-.318-.683-.318-.615 0-1.093.477-1.093 1.134 0 .66.478 1.135 1.092 1.135.318 0 .545-.113.682-.317v.272h.477v-1.09zm-1.773 0c0-.384.25-.702.66-.702.386 0 .66.295.66.703 0 .387-.274.704-.66.704-.41-.022-.66-.317-.66-.703z\" fill=\"#000\" />\r\n      <path fill=\"#FF5F00\" d=\"M23.095 3.49H15.93v12.836h7.165\" />\r\n      <path d=\"M16.382 9.91c0-2.61 1.23-4.922 3.117-6.42-1.39-1.087-3.14-1.745-5.05-1.745-4.528 0-8.19 3.65-8.19 8.164 0 4.51 3.662 8.162 8.19 8.162 1.91 0 3.66-.657 5.05-1.746-1.89-1.474-3.118-3.81-3.118-6.417z\" fill=\"#EB001B\" />\r\n      <path d=\"M32.76 9.91c0 4.51-3.664 8.162-8.19 8.162-1.91 0-3.662-.657-5.05-1.746 1.91-1.496 3.116-3.81 3.116-6.417 0-2.61-1.228-4.922-3.116-6.42 1.388-1.087 3.14-1.745 5.05-1.745 4.526 0 8.19 3.674 8.19 8.164z\" fill=\"#F79E1B\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-unionpay\" viewBox=\"0 0 40 24\">\r\n      <title>Union Pay</title>\r\n      <path d=\"M38.333 24H1.667C.75 24 0 23.28 0 22.4V1.6C0 .72.75 0 1.667 0h36.666C39.25 0 40 .72 40 1.6v20.8c0 .88-.75 1.6-1.667 1.6z\" fill=\"#FFF\" />\r\n      <path d=\"M9.877 2h8.126c1.135 0 1.84.93 1.575 2.077l-3.783 16.35c-.267 1.142-1.403 2.073-2.538 2.073H5.13c-1.134 0-1.84-.93-1.574-2.073L7.34 4.076C7.607 2.93 8.74 2 9.878 2z\" fill=\"#E21836\" />\r\n      <path d=\"M17.325 2h9.345c1.134 0 .623.93.356 2.077l-3.783 16.35c-.265 1.142-.182 2.073-1.32 2.073H12.58c-1.137 0-1.84-.93-1.574-2.073l3.783-16.35C15.056 2.93 16.19 2 17.324 2z\" fill=\"#00447B\" />\r\n      <path d=\"M26.3 2h8.126c1.136 0 1.84.93 1.575 2.077l-3.782 16.35c-.266 1.142-1.402 2.073-2.54 2.073h-8.122c-1.137 0-1.842-.93-1.574-2.073l3.78-16.35C24.03 2.93 25.166 2 26.303 2z\" fill=\"#007B84\" />\r\n      <path d=\"M27.633 14.072l-.99 3.3h.266l-.208.68h-.266l-.062.212h-.942l.064-.21H23.58l.193-.632h.194l1.005-3.35.2-.676h.962l-.1.34s.255-.184.498-.248c.242-.064 1.636-.088 1.636-.088l-.206.672h-.33zm-1.695 0l-.254.843s.285-.13.44-.172c.16-.04.395-.057.395-.057l.182-.614h-.764zm-.38 1.262l-.263.877s.29-.15.447-.196c.157-.037.396-.066.396-.066l.185-.614h-.766zm-.614 2.046h.767l.222-.74h-.765l-.223.74z\" fill=\"#FEFEFE\" />\r\n      <path d=\"M28.055 13.4h1.027l.01.385c-.005.065.05.096.17.096h.208l-.19.637h-.555c-.48.035-.662-.172-.65-.406l-.02-.71zM28.193 16.415h-.978l.167-.566H28.5l.16-.517h-1.104l.19-.638h3.072l-.193.638h-1.03l-.16.516h1.032l-.17.565H29.18l-.2.24h.454l.11.712c.013.07.014.116.036.147.023.026.158.038.238.038h.137l-.21.694h-.348c-.054 0-.133-.004-.243-.01-.105-.008-.18-.07-.25-.105-.064-.03-.16-.11-.182-.24l-.11-.712-.507.7c-.162.222-.38.39-.748.39h-.712l.186-.62h.273c.078 0 .15-.03.2-.056.052-.023.098-.05.15-.126l.74-1.05zM17.478 14.867h2.59l-.19.622H18.84l-.16.53h1.06l-.194.64h-1.06l-.256.863c-.03.095.25.108.353.108l.53-.072-.212.71h-1.193c-.096 0-.168-.013-.272-.037-.1-.023-.145-.07-.19-.138-.043-.07-.11-.128-.064-.278l.343-1.143h-.588l.195-.65h.592l.156-.53h-.588l.188-.623zM19.223 13.75h1.063l-.194.65H18.64l-.157.136c-.067.066-.09.038-.18.087-.08.04-.254.123-.477.123h-.466l.19-.625h.14c.118 0 .198-.01.238-.036.046-.03.098-.096.157-.203l.267-.487h1.057l-.187.356zM20.74 13.4h.905l-.132.46s.286-.23.487-.313c.2-.075.65-.143.65-.143l1.464-.007-.498 1.672c-.085.286-.183.472-.244.555-.055.087-.12.16-.248.23-.124.066-.236.104-.34.115-.096.007-.244.01-.45.012h-1.41l-.4 1.324c-.037.13-.055.194-.03.23.02.03.068.066.135.066l.62-.06-.21.726h-.698c-.22 0-.383-.004-.495-.013-.108-.01-.22 0-.295-.058-.065-.058-.164-.133-.162-.21.007-.073.037-.192.082-.356l1.268-4.23zm1.922 1.69h-1.484l-.09.3h1.283c.152-.018.184.004.196-.003l.096-.297zm-1.402-.272s.29-.266.786-.353c.112-.022.82-.015.82-.015l.106-.357h-1.496l-.216.725z\" fill=\"#FEFEFE\" />\r\n      <path d=\"M23.382 16.1l-.084.402c-.036.125-.067.22-.16.302-.1.084-.216.172-.488.172l-.502.02-.004.455c-.006.13.028.117.048.138.024.022.045.032.067.04l.157-.008.48-.028-.198.663h-.552c-.385 0-.67-.008-.765-.084-.092-.057-.105-.132-.103-.26l.035-1.77h.88l-.013.362h.212c.072 0 .12-.007.15-.026.027-.02.047-.048.06-.093l.087-.282h.692zM10.84 7.222c-.032.143-.596 2.763-.598 2.764-.12.53-.21.91-.508 1.152-.172.14-.37.21-.6.21-.37 0-.587-.185-.624-.537l-.007-.12.113-.712s.593-2.388.7-2.703c.002-.017.005-.026.007-.035-1.152.01-1.357 0-1.37-.018-.007.024-.037.173-.037.173l-.605 2.688-.05.23-.1.746c0 .22.042.4.13.553.275.485 1.06.557 1.504.557.573 0 1.11-.123 1.47-.345.63-.375.797-.962.944-1.48l.067-.267s.61-2.48.716-2.803c.003-.017.006-.026.01-.035-.835.01-1.08 0-1.16-.018zM14.21 12.144c-.407-.006-.55-.006-1.03.018l-.018-.036c.042-.182.087-.363.127-.548l.06-.25c.086-.39.173-.843.184-.98.007-.084.036-.29-.2-.29-.1 0-.203.048-.307.096-.058.207-.174.79-.23 1.055-.118.558-.126.62-.178.897l-.036.037c-.42-.006-.566-.006-1.05.018l-.024-.04c.08-.332.162-.668.24-.998.203-.9.25-1.245.307-1.702l.04-.028c.47-.067.585-.08 1.097-.185l.043.047-.077.287c.086-.052.168-.104.257-.15.242-.12.51-.155.658-.155.223 0 .468.062.57.323.098.232.034.52-.094 1.084l-.066.287c-.13.627-.152.743-.225 1.174l-.05.036zM15.87 12.144c-.245 0-.405-.006-.56 0-.153 0-.303.008-.532.018l-.013-.02-.015-.02c.062-.238.097-.322.128-.406.03-.084.06-.17.115-.41.072-.315.116-.535.147-.728.033-.187.052-.346.075-.53l.02-.014.02-.018c.244-.036.4-.057.56-.082.16-.024.32-.055.574-.103l.008.023.008.022c-.047.195-.094.39-.14.588-.047.197-.094.392-.137.587-.093.414-.13.57-.152.68-.02.105-.026.163-.063.377l-.022.02-.023.017zM19.542 10.728c.143-.633.033-.928-.108-1.11-.213-.273-.59-.36-.978-.36-.235 0-.793.023-1.23.43-.312.29-.458.687-.546 1.066-.088.387-.19 1.086.447 1.344.198.085.48.108.662.108.466 0 .945-.13 1.304-.513.278-.312.405-.775.448-.965zm-1.07-.046c-.02.106-.113.503-.24.673-.086.123-.19.198-.305.198-.033 0-.235 0-.238-.3-.003-.15.027-.304.063-.47.108-.478.236-.88.56-.88.255 0 .27.298.16.78zM29.536 12.187c-.493-.004-.635-.004-1.09.015l-.03-.037c.124-.472.248-.943.358-1.42.142-.62.175-.882.223-1.244l.037-.03c.49-.07.625-.09 1.135-.186l.015.044c-.093.388-.186.777-.275 1.166-.19.816-.258 1.23-.33 1.658l-.044.035z\" fill=\"#FEFEFE\" />\r\n      <path d=\"M29.77 10.784c.144-.63-.432-.056-.525-.264-.14-.323-.052-.98-.62-1.2-.22-.085-.732.025-1.17.428-.31.29-.458.683-.544 1.062-.088.38-.19 1.078.444 1.328.2.085.384.11.567.103.638-.034 1.124-1.002 1.483-1.386.277-.303.326.115.368-.07zm-.974-.047c-.024.1-.117.503-.244.67-.083.117-.283.192-.397.192-.032 0-.232 0-.24-.3 0-.146.03-.3.067-.467.11-.47.235-.87.56-.87.254 0 .363.293.254.774zM22.332 12.144c-.41-.006-.55-.006-1.03.018l-.018-.036c.04-.182.087-.363.13-.548l.057-.25c.09-.39.176-.843.186-.98.008-.084.036-.29-.198-.29-.1 0-.203.048-.308.096-.057.207-.175.79-.232 1.055-.115.558-.124.62-.176.897l-.035.037c-.42-.006-.566-.006-1.05.018l-.022-.04.238-.998c.203-.9.25-1.245.307-1.702l.038-.028c.472-.067.587-.08 1.098-.185l.04.047-.073.287c.084-.052.17-.104.257-.15.24-.12.51-.155.655-.155.224 0 .47.062.575.323.095.232.03.52-.098 1.084l-.065.287c-.133.627-.154.743-.225 1.174l-.05.036zM26.32 8.756c-.07.326-.282.603-.554.736-.225.114-.498.123-.78.123h-.183l.013-.074.336-1.468.01-.076.007-.058.132.015.71.062c.275.105.388.38.31.74zM25.88 7.22l-.34.003c-.883.01-1.238.006-1.383-.012l-.037.182-.315 1.478-.793 3.288c.77-.01 1.088-.01 1.22.004l.21-1.024s.153-.644.163-.667c0 0 .047-.066.096-.092h.07c.665 0 1.417 0 2.005-.437.4-.298.675-.74.797-1.274.03-.132.054-.29.054-.446 0-.205-.04-.41-.16-.568-.3-.423-.896-.43-1.588-.433zM33.572 9.28l-.04-.043c-.502.1-.594.118-1.058.18l-.034.034-.005.023-.003-.007c-.345.803-.334.63-.615 1.26-.003-.03-.003-.048-.004-.077l-.07-1.37-.044-.043c-.53.1-.542.118-1.03.18l-.04.034-.006.056.003.007c.06.315.047.244.108.738.03.244.065.49.093.73.05.4.077.6.134 1.21-.328.55-.408.757-.722 1.238l.017.044c.478-.018.587-.018.94-.018l.08-.088c.265-.578 2.295-4.085 2.295-4.085zM16.318 9.62c.27-.19.304-.45.076-.586-.23-.137-.634-.094-.906.095-.273.186-.304.45-.075.586.228.134.633.094.905-.096z\" fill=\"#FEFEFE\" />\r\n      <path d=\"M31.238 13.415l-.397.684c-.124.232-.357.407-.728.41l-.632-.01.184-.618h.124c.064 0 .11-.004.148-.022.03-.01.054-.035.08-.072l.233-.373h.988z\" fill=\"#FEFEFE\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-american-express\" viewBox=\"0 0 40 24\">\r\n      <title>American Express</title>\r\n      <path d=\"M38.333 24H1.667C.75 24 0 23.28 0 22.4V1.6C0 .72.75 0 1.667 0h36.666C39.25 0 40 .72 40 1.6v20.8c0 .88-.75 1.6-1.667 1.6z\" fill=\"#FFF\" />\r\n      <path fill=\"#1478BE\" d=\"M6.26 12.32h2.313L7.415 9.66M27.353 9.977h-3.738v1.23h3.666v1.384h-3.675v1.385h3.821v1.005c.623-.77 1.33-1.466 2.025-2.235l.707-.77c-.934-1.004-1.87-2.08-2.804-3.075v1.077z\" />\r\n      <path d=\"M38.25 7h-5.605l-1.328 1.4L30.072 7H16.984l-1.017 2.416L14.877 7h-9.58L1.25 16.5h4.826l.623-1.556h1.4l.623 1.556H29.99l1.327-1.483 1.328 1.483h5.605l-4.36-4.667L38.25 7zm-17.685 8.1h-1.557V9.883L16.673 15.1h-1.33L13.01 9.883l-.084 5.217H9.73l-.623-1.556h-3.27L5.132 15.1H3.42l2.884-6.772h2.42l2.645 6.233V8.33h2.646l2.107 4.51 1.868-4.51h2.575V15.1zm14.727 0h-2.024l-2.024-2.26-2.023 2.26H22.06V8.328H29.53l1.795 2.177 2.024-2.177h2.025L32.26 11.75l3.032 3.35z\" fill=\"#1478BE\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-jcb\" viewBox=\"0 0 40 24\">\r\n      <title>JCB</title>\r\n      <path d=\"M38.333 24H1.667C.75 24 0 23.28 0 22.4V1.6C0 .72.75 0 1.667 0h36.666C39.25 0 40 .72 40 1.6v20.8c0 .88-.75 1.6-1.667 1.6z\" fill=\"#FFF\" />\r\n      <path d=\"M33.273 2.01h.013v17.062c-.004 1.078-.513 2.103-1.372 2.746-.63.47-1.366.67-2.14.67-.437 0-4.833.026-4.855 0-.01-.01 0-.07 0-.082v-6.82c0-.04.004-.064.033-.064h5.253c.867 0 1.344-.257 1.692-.61.44-.448.574-1.162.294-1.732-.24-.488-.736-.78-1.244-.913-.158-.04-.32-.068-.483-.083-.01 0-.064 0-.07-.006-.03-.034.023-.04.038-.046.102-.033.215-.042.32-.073.532-.164.993-.547 1.137-1.105.15-.577-.05-1.194-.524-1.552-.34-.257-.768-.376-1.187-.413-.43-.038-4.774-.022-5.21-.022-.072 0-.05-.02-.05-.09V5.63c0-.31.01-.616.073-.92.126-.592.41-1.144.815-1.59.558-.615 1.337-1.01 2.16-1.093.478-.048 4.89-.017 5.305-.017zm-4.06 8.616c.06.272-.01.567-.204.77-.173.176-.407.25-.648.253-.195.003-1.725 0-1.788 0l.003-1.645c.012-.027.02-.018.06-.018.097 0 1.713-.004 1.823.005.232.02.45.12.598.306.076.096.128.208.155.328zm-2.636 2.038h1.944c.242.002.47.063.652.228.226.204.327.515.283.815-.04.263-.194.5-.422.634-.187.112-.39.125-.6.125h-1.857v-1.8z\" fill=\"#53B230\" />\r\n      <path d=\"M6.574 13.89c-.06-.03-.06-.018-.07-.06-.006-.026-.005-8.365.003-8.558.04-.95.487-1.857 1.21-2.47.517-.434 1.16-.71 1.83-.778.396-.04.803-.018 1.2-.018.69 0 4.11-.013 4.12 0 .008.008.002 16.758 0 17.074-.003.956-.403 1.878-1.105 2.523-.506.465-1.15.77-1.83.86-.41.056-5.02.032-5.363.032-.066 0-.054.013-.066-.024-.01-.025 0-7 0-7.17.66.178 1.35.28 2.03.348.662.067 1.33.093 1.993.062.93-.044 1.947-.192 2.712-.762.32-.238.574-.553.73-.922.148-.353.2-.736.2-1.117 0-.348.006-3.93-.016-3.942-.023-.014-2.885-.015-2.9.012-.012.022 0 3.87 0 3.95-.003.47-.16.933-.514 1.252-.468.42-1.11.47-1.707.423-.687-.055-1.357-.245-1.993-.508-.157-.065-.312-.135-.466-.208z\" fill=\"#006CB9\" />\r\n      <path d=\"M15.95 9.835c-.025.02-.05.04-.072.06V6.05c0-.295-.012-.594.01-.888.12-1.593 1.373-2.923 2.944-3.126.382-.05 5.397-.042 5.41-.026.01.01 0 .062 0 .074v16.957c0 1.304-.725 2.52-1.89 3.1-.504.25-1.045.35-1.605.35-.322 0-4.757.015-4.834 0-.05-.01-.023.01-.035-.02-.007-.022 0-6.548 0-7.44v-.422c.554.48 1.256.75 1.96.908.536.12 1.084.176 1.63.196.537.02 1.076.01 1.61-.037.546-.05 1.088-.136 1.625-.244.137-.028.274-.057.41-.09.033-.006.17-.017.187-.044.013-.02 0-.097 0-.12v-1.324c-.582.292-1.19.525-1.83.652-.778.155-1.64.198-2.385-.123-.752-.326-1.2-1.024-1.274-1.837-.076-.837.173-1.716.883-2.212.736-.513 1.7-.517 2.553-.38.634.1 1.245.305 1.825.58.078.037.154.075.23.113V9.322c0-.02.013-.1 0-.118-.02-.028-.152-.038-.188-.046-.066-.016-.133-.03-.2-.045C22.38 9 21.84 8.908 21.3 8.85c-.533-.06-1.068-.077-1.603-.066-.542.01-1.086.054-1.62.154-.662.125-1.32.337-1.883.716-.085.056-.167.117-.245.18z\" fill=\"#E20138\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-discover\" viewBox=\"0 0 40 24\">\r\n      <title>Discover</title>\r\n      <path d=\"M38.333 24H1.667C.75 24 0 23.28 0 22.4V1.6C0 .72.75 0 1.667 0h36.666C39.25 0 40 .72 40 1.6v20.8c0 .88-.75 1.6-1.667 1.6z\" fill=\"#FFF\" />\r\n      <path d=\"M38.995 11.75S27.522 20.1 6.5 23.5h31.495c.552 0 1-.448 1-1V11.75z\" fill=\"#F48024\" />\r\n      <path d=\"M5.332 11.758c-.338.305-.776.438-1.47.438h-.29V8.55h.29c.694 0 1.115.124 1.47.446.37.33.595.844.595 1.372 0 .53-.224 1.06-.595 1.39zM4.077 7.615H2.5v5.515h1.57c.833 0 1.435-.197 1.963-.637.63-.52 1-1.305 1-2.116 0-1.628-1.214-2.762-2.956-2.762zM7.53 13.13h1.074V7.616H7.53M11.227 9.732c-.645-.24-.834-.397-.834-.695 0-.347.338-.61.8-.61.322 0 .587.132.867.446l.562-.737c-.462-.405-1.015-.612-1.618-.612-.975 0-1.718.678-1.718 1.58 0 .76.346 1.15 1.355 1.513.42.148.635.247.743.314.215.14.322.34.322.57 0 .448-.354.78-.834.78-.51 0-.924-.258-1.17-.736l-.695.67c.495.726 1.09 1.05 1.907 1.05 1.116 0 1.9-.745 1.9-1.812 0-.876-.363-1.273-1.585-1.72zM13.15 10.377c0 1.62 1.27 2.877 2.907 2.877.462 0 .858-.09 1.347-.32v-1.267c-.43.43-.81.604-1.297.604-1.082 0-1.85-.785-1.85-1.9 0-1.06.792-1.895 1.8-1.895.512 0 .9.183 1.347.62V7.83c-.472-.24-.86-.34-1.322-.34-1.627 0-2.932 1.283-2.932 2.887zM25.922 11.32l-1.468-3.705H23.28l2.337 5.656h.578l2.38-5.655H27.41M29.06 13.13h3.046v-.934h-1.973v-1.488h1.9v-.934h-1.9V8.55h1.973v-.935H29.06M34.207 10.154h-.314v-1.67h.33c.67 0 1.034.28 1.034.818 0 .554-.364.852-1.05.852zm2.155-.91c0-1.033-.71-1.628-1.95-1.628H32.82v5.514h1.073v-2.215h.14l1.487 2.215h1.32l-1.733-2.323c.81-.165 1.255-.72 1.255-1.563z\" fill=\"#221F20\" />\r\n      <path d=\"M23.6 10.377c0 1.62-1.31 2.93-2.927 2.93-1.617.002-2.928-1.31-2.928-2.93s1.31-2.932 2.928-2.932c1.618 0 2.928 1.312 2.928 2.932z\" fill=\"#F48024\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-diners-club\" viewBox=\"0 0 40 24\">\r\n      <title>Diners Club</title>\r\n      <path d=\"M38.333 24H1.667C.75 24 0 23.28 0 22.4V1.6C0 .72.75 0 1.667 0h36.666C39.25 0 40 .72 40 1.6v20.8c0 .88-.75 1.6-1.667 1.6z\" fill=\"#FFF\" />\r\n      <path d=\"M9.02 11.83c0-5.456 4.54-9.88 10.14-9.88 5.6 0 10.139 4.424 10.139 9.88-.002 5.456-4.54 9.88-10.14 9.88-5.6 0-10.14-4.424-10.14-9.88z\" fill=\"#FEFEFE\" />\r\n      <path fill=\"#FFF\" d=\"M32.522 22H8.5V1.5h24.022\" />\r\n      <path d=\"M25.02 11.732c-.003-2.534-1.607-4.695-3.868-5.55v11.102c2.26-.857 3.865-3.017 3.87-5.552zm-8.182 5.55V6.18c-2.26.86-3.86 3.017-3.867 5.55.007 2.533 1.61 4.69 3.868 5.55zm2.158-14.934c-5.25.002-9.503 4.202-9.504 9.384 0 5.182 4.254 9.38 9.504 9.382 5.25 0 9.504-4.2 9.505-9.382 0-5.182-4.254-9.382-9.504-9.384zM18.973 22C13.228 22.027 8.5 17.432 8.5 11.84 8.5 5.726 13.228 1.5 18.973 1.5h2.692c5.677 0 10.857 4.225 10.857 10.34 0 5.59-5.18 10.16-10.857 10.16h-2.692z\" fill=\"#004A97\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-maestro\" viewBox=\"0 0 40 24\">\r\n      <title>Maestro</title>\r\n      <path d=\"M38.333 24H1.667C.75 24 0 23.28 0 22.4V1.6C0 .72.75 0 1.667 0h36.666C39.25 0 40 .72 40 1.6v20.8c0 .88-.75 1.6-1.667 1.6z\" fill=\"#FFF\" />\r\n      <path d=\"M14.67 22.39V21c.022-.465-.303-.86-.767-.882h-.116c-.3-.023-.603.14-.788.394-.164-.255-.442-.417-.743-.394-.256-.023-.51.116-.65.324v-.278h-.487v2.203h.487v-1.183c-.046-.278.162-.533.44-.58h.094c.325 0 .488.21.488.58v1.23h.487v-1.23c-.047-.278.162-.556.44-.58h.093c.325 0 .487.21.487.58v1.23l.534-.024zm2.712-1.09v-1.113h-.487v.28c-.162-.21-.417-.326-.695-.326-.65 0-1.16.51-1.16 1.16 0 .65.51 1.16 1.16 1.16.278 0 .533-.117.695-.325v.278h.487V21.3zm-1.786 0c.024-.37.348-.65.72-.626.37.023.65.348.626.72-.023.347-.302.625-.673.625-.372 0-.674-.28-.674-.65-.023-.047-.023-.047 0-.07zm12.085-1.16c.163 0 .325.024.465.094.14.046.278.14.37.255.117.115.186.23.256.37.117.3.117.626 0 .927-.046.14-.138.255-.254.37-.116.117-.232.186-.37.256-.303.116-.65.116-.952 0-.14-.046-.28-.14-.37-.255-.118-.116-.187-.232-.257-.37-.116-.302-.116-.627 0-.928.047-.14.14-.255.256-.37.115-.117.23-.187.37-.256.163-.07.325-.116.488-.093zm0 .465c-.092 0-.185.023-.278.046-.092.024-.162.094-.232.14-.07.07-.116.14-.14.232-.068.185-.068.394 0 .58.024.092.094.162.14.23.07.07.14.117.232.14.186.07.37.07.557 0 .092-.023.16-.092.23-.14.07-.068.117-.138.14-.23.07-.186.07-.395 0-.58-.023-.093-.093-.162-.14-.232-.07-.07-.138-.116-.23-.14-.094-.045-.187-.07-.28-.045zm-7.677.695c0-.695-.44-1.16-1.043-1.16-.65 0-1.16.534-1.137 1.183.023.65.534 1.16 1.183 1.136.325 0 .65-.093.905-.302l-.23-.348c-.187.14-.42.232-.65.232-.326.023-.627-.21-.673-.533h1.646v-.21zm-1.646-.21c.023-.3.278-.532.58-.532.3 0 .556.232.556.533h-1.136zm3.664-.346c-.207-.116-.44-.186-.695-.186-.255 0-.417.093-.417.255 0 .163.162.186.37.21l.233.022c.488.07.766.278.766.672 0 .395-.37.72-1.02.72-.348 0-.673-.094-.95-.28l.23-.37c.21.162.465.232.743.232.324 0 .51-.094.51-.28 0-.115-.117-.185-.395-.23l-.232-.024c-.487-.07-.765-.302-.765-.65 0-.44.37-.718.927-.718.325 0 .627.07.905.232l-.21.394zm2.32-.116h-.788v.997c0 .23.07.37.325.37.14 0 .3-.046.417-.115l.14.417c-.186.116-.395.162-.604.162-.58 0-.765-.302-.765-.812v-1.02h-.44v-.44h.44v-.673h.487v.672h.79v.44zm1.67-.51c.117 0 .233.023.35.07l-.14.463c-.093-.045-.21-.045-.302-.045-.325 0-.464.208-.464.58v1.25h-.487v-2.2h.487v.277c.116-.255.325-.37.557-.394z\" fill=\"#000\" />\r\n      <path fill=\"#7673C0\" d=\"M23.64 3.287h-7.305V16.41h7.306\" />\r\n      <path d=\"M16.8 9.848c0-2.55 1.183-4.985 3.2-6.56C16.384.435 11.12 1.06 8.29 4.7 5.435 8.32 6.06 13.58 9.703 16.41c3.038 2.387 7.283 2.387 10.32 0-2.04-1.578-3.223-3.99-3.223-6.562z\" fill=\"#EB001B\" />\r\n      <path d=\"M33.5 9.848c0 4.613-3.735 8.346-8.35 8.346-1.88 0-3.69-.626-5.15-1.785 3.618-2.83 4.245-8.092 1.415-11.71-.418-.532-.882-.996-1.415-1.413C23.618.437 28.883 1.06 31.736 4.7 32.873 6.163 33.5 7.994 33.5 9.85z\" fill=\"#00A1DF\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-elo\" viewBox=\"0 0 48 29\">\r\n      <title>Elo</title>\r\n      <path d=\"M46.177 29H1.823C.9 29 0 28.13 0 27.187V1.813C0 .87.9 0 1.823 0h44.354C47.1 0 48 .87 48 1.813v25.375C48 28.13 47.1 29 46.177 29z\" fill=\"#FFF\" />\r\n      <path d=\"M4.8 9.14c0-.427.57-.973 1.067-.973h7.466c.496 0 1.067.546 1.067.972v3.888c0 .425-.57.972-1.067.972H5.867c-.496 0-1.067-.547-1.067-.972v-3.89z\" fill=\"#828282\" />\r\n      <rect fill=\"#828282\" x=\"10.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <rect fill=\"#828282\" x=\"4.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <path d=\"M6.55 16.333h34.9c.966 0 1.75.784 1.75 1.75 0 .967-.784 1.75-1.75 1.75H6.55c-.966 0-1.75-.783-1.75-1.75 0-.966.784-1.75 1.75-1.75z\" fill=\"#828282\" />\r\n      <ellipse fill=\"#828282\" cx=\"40.2\" cy=\"6.417\" rx=\"3\" ry=\"2.917\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-hiper\" viewBox=\"0 0 48 29\">\r\n      <title>Hiper</title>\r\n      <path d=\"M46.177 29H1.823C.9 29 0 28.13 0 27.187V1.813C0 .87.9 0 1.823 0h44.354C47.1 0 48 .87 48 1.813v25.375C48 28.13 47.1 29 46.177 29z\" fill=\"#FFF\" />\r\n      <path d=\"M4.8 9.14c0-.427.57-.973 1.067-.973h7.466c.496 0 1.067.546 1.067.972v3.888c0 .425-.57.972-1.067.972H5.867c-.496 0-1.067-.547-1.067-.972v-3.89z\" fill=\"#828282\" />\r\n      <rect fill=\"#828282\" x=\"10.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <rect fill=\"#828282\" x=\"4.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <path d=\"M6.55 16.333h34.9c.966 0 1.75.784 1.75 1.75 0 .967-.784 1.75-1.75 1.75H6.55c-.966 0-1.75-.783-1.75-1.75 0-.966.784-1.75 1.75-1.75z\" fill=\"#828282\" />\r\n      <ellipse fill=\"#828282\" cx=\"40.2\" cy=\"6.417\" rx=\"3\" ry=\"2.917\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"icon-hipercard\" viewBox=\"0 0 48 29\">\r\n      <title>Hipercard</title>\r\n      <path d=\"M46.177 29H1.823C.9 29 0 28.13 0 27.187V1.813C0 .87.9 0 1.823 0h44.354C47.1 0 48 .87 48 1.813v25.375C48 28.13 47.1 29 46.177 29z\" fill=\"#FFF\" />\r\n      <path d=\"M4.8 9.14c0-.427.57-.973 1.067-.973h7.466c.496 0 1.067.546 1.067.972v3.888c0 .425-.57.972-1.067.972H5.867c-.496 0-1.067-.547-1.067-.972v-3.89z\" fill=\"#828282\" />\r\n      <rect fill=\"#828282\" x=\"10.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <rect fill=\"#828282\" x=\"4.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <path d=\"M6.55 16.333h34.9c.966 0 1.75.784 1.75 1.75 0 .967-.784 1.75-1.75 1.75H6.55c-.966 0-1.75-.783-1.75-1.75 0-.966.784-1.75 1.75-1.75z\" fill=\"#828282\" />\r\n      <ellipse fill=\"#828282\" cx=\"40.2\" cy=\"6.417\" rx=\"3\" ry=\"2.917\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"logoPayPal\" viewBox=\"0 0 48 29\">\r\n      <title>PayPal Logo</title>\r\n      <path d=\"M46 29H2c-1.1 0-2-.87-2-1.932V1.934C0 .87.9 0 2 0h44c1.1 0 2 .87 2 1.934v25.134C48 28.13 47.1 29 46 29z\" fill-opacity=\"0\" fill=\"#FFF\" />\r\n      <path d=\"M31.216 16.4c.394-.7.69-1.5.886-2.4.196-.8.196-1.6.1-2.2-.1-.7-.396-1.2-.79-1.7-.195-.3-.59-.5-.885-.7.1-.8.1-1.5 0-2.1-.1-.6-.394-1.1-.886-1.6-.885-1-2.56-1.6-4.922-1.6h-6.4c-.492 0-.787.3-.886.8l-2.658 17.2c0 .2 0 .3.1.4.097.1.294.2.393.2h4.036l-.295 1.8c0 .1 0 .3.1.4.098.1.195.2.393.2h3.35c.393 0 .688-.3.786-.7v-.2l.59-4.1v-.2c.1-.4.395-.7.788-.7h.59c1.675 0 3.152-.4 4.137-1.1.59-.5 1.083-1 1.478-1.7h-.002z\" fill=\"#263B80\" />\r\n      <path d=\"M21.364 9.4c0-.3.196-.5.492-.6.098-.1.196-.1.394-.1h5.02c.592 0 1.183 0 1.675.1.1 0 .295.1.394.1.098 0 .294.1.393.1.1 0 .1 0 .197.102.295.1.492.2.69.3.295-1.6 0-2.7-.887-3.8-.985-1.1-2.658-1.6-4.923-1.6h-6.4c-.49 0-.885.3-.885.8l-2.758 17.3c-.098.3.197.6.59.6h3.94l.985-6.4 1.083-6.9z\" fill=\"#263B80\" />\r\n      <path d=\"M30.523 9.4c0 .1 0 .3-.098.4-.887 4.4-3.742 5.9-7.484 5.9h-1.87c-.492 0-.787.3-.886.8l-.985 6.2-.296 1.8c0 .3.196.6.492.6h3.348c.394 0 .69-.3.787-.7v-.2l.592-4.1v-.2c.1-.4.394-.7.787-.7h.69c3.248 0 5.808-1.3 6.497-5.2.296-1.6.197-3-.69-3.9-.196-.3-.49-.5-.885-.7z\" fill=\"#159BD7\" />\r\n      <path d=\"M29.635 9c-.098 0-.295-.1-.394-.1-.098 0-.294-.1-.393-.1-.492-.102-1.083-.102-1.673-.102h-5.022c-.1 0-.197 0-.394.1-.198.1-.394.3-.492.6l-1.083 6.9v.2c.1-.5.492-.8.886-.8h1.87c3.742 0 6.598-1.5 7.484-5.9 0-.1 0-.3.098-.4-.196-.1-.492-.2-.69-.3 0-.1-.098-.1-.196-.1z\" fill=\"#232C65\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"logoPayPalCredit\" viewBox=\"0 0 48 29\">\r\n      <title>PayPal Credit Logo</title>\r\n      <path d=\"M46 29H2c-1.1 0-2-.87-2-1.932V1.934C0 .87.9 0 2 0h44c1.1 0 2 .87 2 1.934v25.134C48 28.13 47.1 29 46 29z\" fill-opacity=\"0\" fill=\"#FFF\" fill-rule=\"nonzero\" />\r\n      <path d=\"M27.44 21.6h.518c1.377 0 2.67-.754 2.953-2.484.248-1.588-.658-2.482-2.14-2.482h-.38c-.093 0-.172.067-.187.16l-.763 4.805zm-1.254-6.646c.024-.158.16-.273.32-.273h2.993c2.47 0 4.2 1.942 3.81 4.436-.4 2.495-2.752 4.436-5.21 4.436h-3.05c-.116 0-.205-.104-.187-.218l1.323-8.38zM22.308 16.907l-.192 1.21h2.38c.116 0 .204.103.186.217l-.23 1.462c-.023.157-.16.273-.318.273h-2.048c-.16 0-.294.114-.32.27l-.203 1.26h2.52c.117 0 .205.102.187.217l-.228 1.46c-.025.16-.16.275-.32.275h-4.55c-.116 0-.204-.104-.186-.218l1.322-8.38c.025-.158.16-.273.32-.273h4.55c.116 0 .205.104.187.22l-.23 1.46c-.024.158-.16.274-.32.274H22.63c-.16 0-.295.115-.32.273M35.325 23.552h-1.81c-.115 0-.203-.104-.185-.218l1.322-8.38c.025-.158.16-.273.32-.273h1.81c.115 0 .203.104.185.22l-1.322 8.38c-.025.156-.16.272-.32.272M14.397 18.657h.224c.754 0 1.62-.14 1.777-1.106.158-.963-.345-1.102-1.15-1.104h-.326c-.097 0-.18.07-.197.168l-.326 2.043zm3.96 4.895h-2.37c-.102 0-.194-.058-.238-.15l-1.565-3.262h-.023l-.506 3.19c-.02.128-.13.222-.26.222h-1.86c-.116 0-.205-.104-.187-.218l1.33-8.432c.02-.128.13-.22.26-.22h3.222c1.753 0 2.953.834 2.66 2.728-.2 1.224-1.048 2.283-2.342 2.506l2.037 3.35c.076.125-.014.286-.16.286zM40.216 23.552h-1.808c-.116 0-.205-.104-.187-.218l1.06-6.7h-1.684c-.116 0-.205-.104-.187-.218l.228-1.462c.025-.157.16-.273.32-.273h5.62c.116 0 .205.104.186.22l-.228 1.46c-.025.158-.16.274-.32.274h-1.63l-1.05 6.645c-.025.156-.16.272-.32.272M11.467 17.202c-.027.164-.228.223-.345.104-.395-.405-.975-.62-1.6-.62-1.41 0-2.526 1.083-2.75 2.458-.21 1.4.588 2.41 2.022 2.41.592 0 1.22-.225 1.74-.6.144-.105.34.02.313.194l-.328 2.03c-.02.12-.108.22-.226.254-.702.207-1.24.355-1.9.355-3.823 0-4.435-3.266-4.238-4.655.553-3.894 3.712-4.786 5.65-4.678.623.034 1.182.117 1.73.323.177.067.282.25.252.436l-.32 1.99\" fill=\"#21306F\" />\r\n      <path d=\"M23.184 7.67c-.11.717-.657.717-1.186.717h-.302l.212-1.34c.013-.08.082-.14.164-.14h.138c.36 0 .702 0 .877.206.105.123.137.305.097.557zm-.23-1.87h-1.998c-.137 0-.253.098-.274.233l-.808 5.123c-.016.1.062.192.165.192h1.024c.095 0 .177-.07.192-.164l.23-1.452c.02-.135.136-.235.273-.235h.63c1.317 0 2.076-.636 2.275-1.898.09-.553.003-.987-.255-1.29-.284-.334-.788-.51-1.456-.51z\" fill=\"#0093C7\" />\r\n      <path d=\"M8.936 7.67c-.11.717-.656.717-1.186.717h-.302l.212-1.34c.013-.08.082-.14.164-.14h.138c.36 0 .702 0 .877.206.104.123.136.305.096.557zm-.23-1.87H6.708c-.136 0-.253.098-.274.233l-.808 5.123c-.016.1.062.192.165.192h.955c.136 0 .252-.1.274-.234l.217-1.382c.02-.135.137-.235.274-.235h.633c1.316 0 2.075-.636 2.274-1.898.09-.553.003-.987-.255-1.29-.284-.334-.788-.51-1.456-.51zM13.343 9.51c-.092.545-.526.912-1.08.912-.277 0-.5-.09-.642-.258-.14-.168-.193-.406-.148-.672.086-.542.527-.92 1.072-.92.27 0 .492.09.637.26.148.172.205.412.163.677zm1.334-1.863h-.957c-.082 0-.152.06-.164.14l-.042.268-.067-.097c-.208-.3-.67-.4-1.13-.4-1.057 0-1.96.8-2.135 1.923-.092.56.038 1.097.356 1.47.29.344.708.487 1.204.487.852 0 1.325-.548 1.325-.548l-.043.265c-.016.1.062.193.164.193h.862c.136 0 .253-.1.274-.234l.517-3.275c.017-.102-.06-.193-.163-.193z\" fill=\"#21306F\" />\r\n      <path d=\"M27.59 9.51c-.09.545-.525.912-1.078.912-.278 0-.5-.09-.643-.258-.142-.168-.195-.406-.15-.672.086-.542.526-.92 1.07-.92.273 0 .494.09.64.26.146.172.203.412.16.677zm1.334-1.863h-.956c-.082 0-.152.06-.164.14l-.043.268-.065-.097c-.208-.3-.67-.4-1.13-.4-1.057 0-1.96.8-2.136 1.923-.092.56.038 1.097.355 1.47.292.344.71.487 1.205.487.852 0 1.325-.548 1.325-.548l-.043.265c-.016.1.062.193.164.193h.862c.136 0 .253-.1.274-.234l.517-3.275c.015-.102-.063-.193-.166-.193z\" fill=\"#0093C7\" />\r\n      <path d=\"M19.77 7.647h-.96c-.092 0-.178.045-.23.122L17.254 9.72l-.562-1.877c-.035-.118-.143-.198-.266-.198h-.945c-.113 0-.194.112-.157.22l1.06 3.108-.997 1.404c-.078.11 0 .262.136.262h.96c.092 0 .177-.044.23-.12l3.196-4.614c.077-.11-.002-.26-.137-.26\" fill=\"#21306F\" />\r\n      <path d=\"M30.052 5.94l-.82 5.216c-.016.1.062.192.165.192h.824c.138 0 .254-.1.275-.234l.81-5.122c.015-.1-.064-.193-.166-.193h-.924c-.082 0-.15.06-.164.14\" fill=\"#0093C7\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"iconCardFront\" viewBox=\"0 0 48 29\">\r\n      <title>Generic Card</title>\r\n      <path d=\"M46.177 29H1.823C.9 29 0 28.13 0 27.187V1.813C0 .87.9 0 1.823 0h44.354C47.1 0 48 .87 48 1.813v25.375C48 28.13 47.1 29 46.177 29z\" fill=\"#FFF\" />\r\n      <path d=\"M4.8 9.14c0-.427.57-.973 1.067-.973h7.466c.496 0 1.067.546 1.067.972v3.888c0 .425-.57.972-1.067.972H5.867c-.496 0-1.067-.547-1.067-.972v-3.89z\" fill=\"#828282\" />\r\n      <rect fill=\"#828282\" x=\"10.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <rect fill=\"#828282\" x=\"4.8\" y=\"22.167\" width=\"3.6\" height=\"2.333\" rx=\"1.167\" />\r\n      <path d=\"M6.55 16.333h34.9c.966 0 1.75.784 1.75 1.75 0 .967-.784 1.75-1.75 1.75H6.55c-.966 0-1.75-.783-1.75-1.75 0-.966.784-1.75 1.75-1.75z\" fill=\"#828282\" />\r\n      <ellipse fill=\"#828282\" cx=\"40.2\" cy=\"6.417\" rx=\"3\" ry=\"2.917\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"iconCVVBack\" viewBox=\"0 0 40 24\">\r\n      <title>CVV Back</title>\r\n      <path d=\"M38.48 24H1.52C.75 24 0 23.28 0 22.5v-21C0 .72.75 0 1.52 0h36.96C39.25 0 40 .72 40 1.5v21c0 .78-.75 1.5-1.52 1.5z\" fill=\"#FFF\"/>\r\n      <path fill=\"#828282\" d=\"M0 5h40v4H0z\" />\r\n      <path d=\"M20 13.772v5.456c0 .423.37.772.82.772h13.36c.45 0 .82-.35.82-.772v-5.456c0-.423-.37-.772-.82-.772H20.82c-.45 0-.82.35-.82.772zm-1-.142c0-.9.76-1.63 1.68-1.63h13.64c.928 0 1.68.737 1.68 1.63v5.74c0 .9-.76 1.63-1.68 1.63H20.68c-.928 0-1.68-.737-1.68-1.63v-5.74z\" fill=\"#000\" fill-rule=\"nonzero\" />\r\n      <circle fill=\"#828282\" cx=\"23.5\" cy=\"16.5\" r=\"1.5\" />\r\n      <circle fill=\"#828282\" cx=\"27.5\" cy=\"16.5\" r=\"1.5\" />\r\n      <circle fill=\"#828282\" cx=\"31.5\" cy=\"16.5\" r=\"1.5\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"iconCVVFront\" viewBox=\"0 0 40 24\">\r\n      <title>CVV Front</title>\r\n      <path d=\"M38.48 24H1.52C.75 24 0 23.28 0 22.5v-21C0 .72.75 0 1.52 0h36.96C39.25 0 40 .72 40 1.5v21c0 .78-.75 1.5-1.52 1.5z\" fill=\"#FFF\" />\r\n      <path d=\"M16 5.772v5.456c0 .423.366.772.81.772h17.38c.444 0 .81-.348.81-.772V5.772C35 5.35 34.634 5 34.19 5H16.81c-.444 0-.81.348-.81.772zm-1-.142c0-.9.75-1.63 1.66-1.63h17.68c.917 0 1.66.737 1.66 1.63v5.74c0 .9-.75 1.63-1.66 1.63H16.66c-.917 0-1.66-.737-1.66-1.63V5.63z\" fill=\"#000\" fill-rule=\"nonzero\" />\r\n      <circle fill=\"#828282\" cx=\"19.5\" cy=\"8.5\" r=\"1.5\" />\r\n      <circle fill=\"#828282\" cx=\"27.5\" cy=\"8.5\" r=\"1.5\" />\r\n      <circle fill=\"#828282\" cx=\"23.5\" cy=\"8.5\" r=\"1.5\" />\r\n      <circle fill=\"#828282\" cx=\"31.5\" cy=\"8.5\" r=\"1.5\" />\r\n      <path d=\"M4 7.833C4 7.47 4.476 7 4.89 7h6.22c.414 0 .89.47.89.833v3.334c0 .364-.476.833-.89.833H4.89c-.414 0-.89-.47-.89-.833V7.833zM4 18.5c0-.828.668-1.5 1.5-1.5h29c.828 0 1.5.666 1.5 1.5 0 .828-.668 1.5-1.5 1.5h-29c-.828 0-1.5-.666-1.5-1.5z\" fill=\"#828282\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"iconCheck\" viewBox=\"0 0 42 32\">\r\n      <title>Check</title>\r\n      <path class=\"path1\" d=\"M14.379 29.76L39.741 3.415 36.194.001l-21.815 22.79-10.86-11.17L0 15.064z\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"iconX\" viewBox=\"0 0 32 32\">\r\n      <title>X</title>\r\n      <path d=\"M29 3.54L25.46 0 14.5 10.97 3.54 0.01 0 3.54 10.96 14.5 0.01 25.46 3.54 28.99 14.5 18.04 25.46 29 28.99 25.46 18.03 14.5 29 3.54z\"/>\r\n    </symbol>\r\n\r\n    <symbol id=\"iconLockLoader\" viewBox=\"0 0 28 32\">\r\n      <title>Lock Loader</title>\r\n      <path d=\"M6 10V8c0-4.422 3.582-8 8-8 4.41 0 8 3.582 8 8v2h-4V7.995C18 5.79 16.205 4 14 4c-2.21 0-4 1.792-4 3.995V10H6zM.997 14c-.55 0-.997.445-.997.993v16.014c0 .548.44.993.997.993h26.006c.55 0 .997-.445.997-.993V14.993c0-.548-.44-.993-.997-.993H.997z\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"iconError\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\">\r\n      <path d=\"M0 0h24v24H0z\" fill=\"none\" />\r\n      <path d=\"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z\" />\r\n    </symbol>\r\n\r\n    <symbol id=\"logoApplePay\" viewBox=\"0 0 165.52 105.97\" width=\"24\">\r\n      <title>Apple Pay Logo</title>\r\n      <path id=\"_Path_\" data-name=\"&lt;Path&gt;\" fill=\"#231f20\" d=\"M150.7 0h-139a20.78 20.78 0 0 0-3.12.3 10.51 10.51 0 0 0-3 1 9.94 9.94 0 0 0-4.31 4.32 10.46 10.46 0 0 0-1 3A20.65 20.65 0 0 0 0 11.7v82.57a20.64 20.64 0 0 0 .3 3.11 10.46 10.46 0 0 0 1 3 9.94 9.94 0 0 0 4.35 4.35 10.47 10.47 0 0 0 3 1 20.94 20.94 0 0 0 3.11.27h142.06a21 21 0 0 0 3.11-.27 10.48 10.48 0 0 0 3-1 9.94 9.94 0 0 0 4.35-4.35 10.4 10.4 0 0 0 1-3 20.63 20.63 0 0 0 .27-3.11V11.69a20.64 20.64 0 0 0-.27-3.11 10.4 10.4 0 0 0-1-3 9.94 9.94 0 0 0-4.35-4.35 10.52 10.52 0 0 0-3-1 20.84 20.84 0 0 0-3.1-.23h-1.43z\"/>\r\n      <path id=\"_Path_2\" data-name=\"&lt;Path&gt;\" fill=\"#fff\" d=\"M150.7 3.53h3.03a17.66 17.66 0 0 1 2.58.22 7 7 0 0 1 2 .65 6.41 6.41 0 0 1 2.8 2.81 6.88 6.88 0 0 1 .64 2 17.56 17.56 0 0 1 .22 2.58v82.38a17.54 17.54 0 0 1-.22 2.59 6.85 6.85 0 0 1-.64 2 6.41 6.41 0 0 1-2.81 2.81 6.92 6.92 0 0 1-2 .65 18 18 0 0 1-2.57.22H11.79a18 18 0 0 1-2.58-.22 6.94 6.94 0 0 1-2-.65 6.41 6.41 0 0 1-2.8-2.8 6.93 6.93 0 0 1-.65-2 17.47 17.47 0 0 1-.22-2.58v-82.4a17.49 17.49 0 0 1 .22-2.59 6.92 6.92 0 0 1 .65-2 6.41 6.41 0 0 1 2.8-2.8 7 7 0 0 1 2-.65 17.63 17.63 0 0 1 2.58-.22H150.7\"/>\r\n      <g id=\"_Group_\" data-name=\"&lt;Group&gt;\">\r\n      <g id=\"_Group_2\" data-name=\"&lt;Group&gt;\">\r\n      <path id=\"_Path_3\" data-name=\"&lt;Path&gt;\" class=\"cls-1\" d=\"M43.51 35.77a9.15 9.15 0 0 0 2.1-6.52 9.07 9.07 0 0 0-6 3.11 8.56 8.56 0 0 0-2.16 6.27 7.57 7.57 0 0 0 6.06-2.86\"/>\r\n      <path id=\"_Path_4\" data-name=\"&lt;Path&gt;\" class=\"cls-1\" d=\"M45.59 39.08c-3.35-.2-6.2 1.9-7.79 1.9s-4-1.8-6.7-1.75a9.87 9.87 0 0 0-8.4 5.1c-3.6 6.2-.95 15.4 2.55 20.45 1.7 2.5 3.75 5.25 6.45 5.15s3.55-1.65 6.65-1.65 4 1.65 6.7 1.6 4.55-2.5 6.25-5a22.2 22.2 0 0 0 2.8-5.75 9.08 9.08 0 0 1-5.45-8.25A9.26 9.26 0 0 1 53 43.13a9.57 9.57 0 0 0-7.45-4\"/>\r\n      </g>\r\n      <g id=\"_Group_3\" data-name=\"&lt;Group&gt;\">\r\n      <path id=\"_Compound_Path_\" data-name=\"&lt;Compound Path&gt;\" fill=\"#231f20\" d=\"M79 32.11c7.28 0 12.35 5 12.35 12.32S86.15 56.8 78.79 56.8h-8.06v12.82h-5.82V32.11zm-8.27 19.81h6.68c5.07 0 8-2.73 8-7.46S82.48 37 77.44 37h-6.71z\"/>\r\n      <path id=\"_Compound_Path_2\" data-name=\"&lt;Compound Path&gt;\" fill=\"#231f20\" d=\"M92.76 61.85c0-4.81 3.67-7.56 10.42-8l7.25-.44v-2.06c0-3-2-4.7-5.56-4.7-2.94 0-5.07 1.51-5.51 3.82h-5.24c.16-4.86 4.73-8.4 10.92-8.4 6.65 0 11 3.48 11 8.89v18.66h-5.38v-4.5h-.13a9.59 9.59 0 0 1-8.58 4.78c-5.42 0-9.19-3.22-9.19-8.05zm17.68-2.42v-2.11l-6.47.42c-3.64.23-5.54 1.59-5.54 4s2 3.77 5.07 3.77c3.95-.05 6.94-2.57 6.94-6.08z\"/>\r\n      <path id=\"_Compound_Path_3\" data-name=\"&lt;Compound Path&gt;\" fill=\"#231f20\" d=\"M121 79.65v-4.5a17.14 17.14 0 0 0 1.72.1c2.57 0 4-1.09 4.91-3.9l.52-1.66-9.88-27.29h6.08l6.86 22.15h.13l6.86-22.15h5.93l-10.21 28.67c-2.34 6.58-5 8.73-10.68 8.73a15.93 15.93 0 0 1-2.24-.15z\"/>\r\n      </g>\r\n      </g>\r\n    </symbol>\r\n    <symbol id=\"logoGooglePay\" viewbox=\"0 0 752 400\" >\r\n      <g>\r\n        <title>Google Pay Mark</title>\r\n        <path d=\"m552.7,0l-352,0c-110,0 -200,90 -200,200l0,0c0,110 90,200 200,200l352,0c110,0 200,-90 200,-200l0,0c0,-110 -90,-200 -200,-200z\" fill=\"#FFFFFF\" id=\"Base_1_\"/>\r\n        <path d=\"m552.7,16.2c24.7,0 48.7,4.9 71.3,14.5c21.9,9.3 41.5,22.6 58.5,39.5c16.9,16.9 30.2,36.6 39.5,58.5c9.6,22.6 14.5,46.6 14.5,71.3s-4.9,48.7 -14.5,71.3c-9.3,21.9 -22.6,41.5 -39.5,58.5c-16.9,16.9 -36.6,30.2 -58.5,39.5c-22.6,9.6 -46.6,14.5 -71.3,14.5l-352,0c-24.7,0 -48.7,-4.9 -71.3,-14.5c-21.9,-9.3 -41.5,-22.6 -58.5,-39.5c-16.9,-16.9 -30.2,-36.6 -39.5,-58.5c-9.6,-22.6 -14.5,-46.6 -14.5,-71.3s4.9,-48.7 14.5,-71.3c9.3,-21.9 22.6,-41.5 39.5,-58.5c16.9,-16.9 36.6,-30.2 58.5,-39.5c22.6,-9.6 46.6,-14.5 71.3,-14.5l352,0m0,-16.2l-352,0c-110,0 -200,90 -200,200l0,0c0,110 90,200 200,200l352,0c110,0 200,-90 200,-200l0,0c0,-110 -90,-200 -200,-200l0,0z\" fill=\"#3C4043\" id=\"Outline\"/>\r\n        <g id=\"G_Pay_Lockup_1_\">\r\n         <g id=\"Pay_Typeface_3_\">\r\n          <path d=\"m359.3,214.2l0,60.5l-19.2,0l0,-149.4l50.9,0c12.9,0 23.9,4.3 32.9,12.9c9.2,8.6 13.8,19.1 13.8,31.5c0,12.7 -4.6,23.2 -13.8,31.7c-8.9,8.5 -19.9,12.7 -32.9,12.7l-31.7,0l0,0.1zm0,-70.5l0,52.1l32.1,0c7.6,0 14,-2.6 19,-7.7c5.1,-5.1 7.7,-11.3 7.7,-18.3c0,-6.9 -2.6,-13 -7.7,-18.1c-5,-5.3 -11.3,-7.9 -19,-7.9l-32.1,0l0,-0.1z\" fill=\"#3C4043\" id=\"Letter_p_3_\"/>\r\n          <path d=\"m487.9,169.1c14.2,0 25.4,3.8 33.6,11.4c8.2,7.6 12.3,18 12.3,31.2l0,63l-18.3,0l0,-14.2l-0.8,0c-7.9,11.7 -18.5,17.5 -31.7,17.5c-11.3,0 -20.7,-3.3 -28.3,-10s-11.4,-15 -11.4,-25c0,-10.6 4,-19 12,-25.2c8,-6.3 18.7,-9.4 32,-9.4c11.4,0 20.8,2.1 28.1,6.3l0,-4.4c0,-6.7 -2.6,-12.3 -7.9,-17c-5.3,-4.7 -11.5,-7 -18.6,-7c-10.7,0 -19.2,4.5 -25.4,13.6l-16.9,-10.6c9.3,-13.5 23.1,-20.2 41.3,-20.2zm-24.8,74.2c0,5 2.1,9.2 6.4,12.5c4.2,3.3 9.2,5 14.9,5c8.1,0 15.3,-3 21.6,-9s9.5,-13 9.5,-21.1c-6,-4.7 -14.3,-7.1 -25,-7.1c-7.8,0 -14.3,1.9 -19.5,5.6c-5.3,3.9 -7.9,8.6 -7.9,14.1z\" fill=\"#3C4043\" id=\"Letter_a_3_\"/>\r\n          <path d=\"m638.2,172.4l-64,147.2l-19.8,0l23.8,-51.5l-42.2,-95.7l20.9,0l30.4,73.4l0.4,0l29.6,-73.4l20.9,0z\" fill=\"#3C4043\" id=\"Letter_y_3_\"/>\r\n         </g>\r\n         <g id=\"G_Mark_1_\">\r\n          <path d=\"m282.93,202c0,-6.26 -0.56,-12.25 -1.6,-18.01l-80.48,0l0,33l46.35,0.01c-1.88,10.98 -7.93,20.34 -17.2,26.58l0,21.41l27.59,0c16.11,-14.91 25.34,-36.95 25.34,-62.99z\" fill=\"#4285F4\" id=\"Blue_500\"/>\r\n          <path d=\"m230.01,243.58c-7.68,5.18 -17.57,8.21 -29.14,8.21c-22.35,0 -41.31,-15.06 -48.1,-35.36l-28.46,0l0,22.08c14.1,27.98 43.08,47.18 76.56,47.18c23.14,0 42.58,-7.61 56.73,-20.71l-27.59,-21.4z\" fill=\"#34A853\" id=\"Green_500_1_\"/>\r\n          <path d=\"m150.09,200.05c0,-5.7 0.95,-11.21 2.68,-16.39l0,-22.08l-28.46,0c-5.83,11.57 -9.11,24.63 -9.11,38.47s3.29,26.9 9.11,38.47l28.46,-22.08c-1.73,-5.18 -2.68,-10.69 -2.68,-16.39z\" fill=\"#FABB05\" id=\"Yellow_500_1_\"/>\r\n          <path d=\"m200.87,148.3c12.63,0 23.94,4.35 32.87,12.85l24.45,-24.43c-14.85,-13.83 -34.21,-22.32 -57.32,-22.32c-33.47,0 -62.46,19.2 -76.56,47.18l28.46,22.08c6.79,-20.3 25.75,-35.36 48.1,-35.36z\" fill=\"#E94235\" id=\"Red_500\"/>\r\n         </g>\r\n        </g>\r\n       </g>\r\n    </symbol>\r\n\r\n    <symbol id=\"logoVenmo\" viewBox=\"0 0 48 32\">\r\n      <title>Venmo</title>\r\n      <g fill=\"none\" fill-rule=\"evenodd\">\r\n        <rect fill=\"#3D95CE\" width=\"47.4074074\" height=\"31.6049383\" rx=\"3.16049383\"/>\r\n        <path d=\"M33.1851852,10.1131555 C33.1851852,14.8373944 29.2425262,20.9745161 26.0425868,25.2839506 L18.7337285,25.2839506 L15.8024691,7.35534396 L22.202175,6.73384536 L23.7519727,19.4912014 C25.2000422,17.0781163 26.9870326,13.2859484 26.9870326,10.7005 C26.9870326,9.28531656 26.7500128,8.32139205 26.3796046,7.52770719 L32.207522,6.32098765 C32.8813847,7.45939896 33.1851852,8.63196439 33.1851852,10.1131555 Z\" fill=\"#FFF\"/>\r\n      </g>\r\n    </symbol>\r\n    <symbol id=\"buttonVenmo\" viewBox=\"0 0 295 42\">\r\n      <g fill=\"none\" fill-rule=\"evenodd\">\r\n        <rect fill=\"#3D95CE\" width=\"295\" height=\"42\" rx=\"3\"/>\r\n        <path d=\"M11.3250791 0C11.7902741.780434316 12 1.58428287 12 2.59970884 12 5.838396 9.27822123 10.0456806 7.06917212 13L2.02356829 13 0 .709099732 4.41797878.283033306 5.48786751 9.02879887C6.48752911 7.3745159 7.72116169 4.77480706 7.72116169 3.00236102 7.72116169 2.03218642 7.55753727 1.37137098 7.30182933.827262801L11.3250791 0 11.3250791 0zM17.5051689 5.68512193C18.333931 5.68512193 20.4203856 5.28483546 20.4203856 4.03281548 20.4203856 3.43161451 20.0177536 3.13172102 19.5432882 3.13172102 18.7131868 3.13172102 17.6238766 4.18269796 17.5051689 5.68512193L17.5051689 5.68512193zM17.4102028 8.1647385C17.4102028 9.69351403 18.2153451 10.293301 19.2827401 10.293301 20.4451012 10.293301 21.5580312 9.99340752 23.0045601 9.21725797L22.4597224 13.1234575C21.440541 13.649203 19.8521716 14 18.310433 14 14.3996547 14 13 11.49596 13 8.36552446 13 4.30815704 15.2767521 0 19.9706358 0 22.554932 0 24 1.52864698 24 3.65720949 24.0002435 7.08869546 19.8287953 8.13992948 17.4102028 8.1647385L17.4102028 8.1647385zM37 2.84753211C37 3.32189757 36.9261179 4.00994664 36.8526108 4.45959542L35.4649774 12.9998782 30.9621694 12.9998782 32.2279161 5.1711436C32.2519185 4.95879931 32.3256755 4.53131032 32.3256755 4.29412759 32.3256755 3.72466988 31.9603904 3.5825794 31.5212232 3.5825794 30.9379171 3.5825794 30.3532359 3.84326124 29.9638234 4.03356751L28.5281854 13 24 13 26.0686989.213683657 29.9878258.213683657 30.0374555 1.23425123C30.9620444.641294408 32.1795365 3.90379019e-8 33.9069526 3.90379019e-8 36.1955476-.000243475057 37 1.1387937 37 2.84753211L37 2.84753211zM51.2981937 1.39967969C52.6582977.49918987 53.9425913 0 55.7133897 0 58.1518468 0 59 1.13900518 59 2.84769558 59 3.32204771 58.9223438 4.01007745 58.8448195 4.4597136L57.3830637 12.9997565 52.6328518 12.9997565 53.9932194 5.00577861C54.0182698 4.792101 54.0708756 4.53142648 54.0708756 4.36608506 54.0708756 3.72493046 53.6854953 3.58272222 53.2224587 3.58272222 52.6325881 3.58272222 52.0429812 3.81989829 51.6052587 4.03369766L50.0914245 12.9998782 45.3423992 12.9998782 46.7027668 5.00590037C46.7278172 4.79222275 46.7788409 4.53154824 46.7788409 4.36620681 46.7788409 3.72505221 46.3933287 3.58284398 45.9318743 3.58284398 45.3153711 3.58284398 44.7000546 3.84351849 44.2893602 4.03381941L42.7740757 13 38 13 40.1814929.214042876 44.2643098.214042876 44.3925941 1.28145692C45.3423992.641763367 46.6253743.000487014507 48.3452809.000487014507 49.8344603 0 50.8094476.593061916 51.2981937 1.39967969L51.2981937 1.39967969zM67.5285327 5.39061542C67.5285327 4.29258876 67.2694573 3.54396333 66.4936812 3.54396333 64.7759775 3.54396333 64.4232531 6.76273249 64.4232531 8.4093242 64.4232531 9.65848482 64.7530184 10.4315735 65.5285529 10.4315735 67.1521242 10.4315735 67.5285327 7.03707905 67.5285327 5.39061542L67.5285327 5.39061542zM60 8.21054461C60 3.96893154 62.1170713 0 66.988027 0 70.6583423 0 72 2.29633967 72 5.46592624 72 9.65835674 69.905767 14 64.9173573 14 61.2233579 14 60 11.4294418 60 8.21054461L60 8.21054461z\" transform=\"translate(112 14)\" fill=\"#FFF\"/>\r\n      </g>\r\n    </symbol>\r\n\r\n    <symbol id=\"iconClose\" width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" overflow=\"visible\">\r\n      <path d=\"M16 5.414L14.586 4 10 8.586 5.414 4 4 5.414 8.586 10 4 14.586 5.414 16 10 11.414 14.586 16 16 14.586 11.414 10\"/>\r\n    </symbol>\r\n  </defs>\r\n</svg>\r\n";

var PASS_THROUGH_EVENTS = [
  'changeActiveView',
  'paymentMethodRequestable',
  'noPaymentMethodRequestable',
  'paymentOptionSelected',

  // Card View Events
  'card:binAvailable',
  'card:blur',
  'card:cardTypeChange',
  'card:empty',
  'card:focus',
  'card:inputSubmitRequest',
  'card:notEmpty',
  'card:validityChange',

  // 3DS Events
  '3ds:customer-canceled',
  '3ds:authentication-modal-render',
  '3ds:authentication-modal-close'
];
var UPDATABLE_CONFIGURATION_OPTIONS = [
  paymentOptionIDs.paypal,
  paymentOptionIDs.paypalCredit,
  paymentOptionIDs.applePay,
  paymentOptionIDs.googlePay,
  'threeDSecure'
];
var UPDATABLE_CONFIGURATION_OPTIONS_THAT_REQUIRE_UNVAULTED_PAYMENT_METHODS_TO_BE_REMOVED = [
  paymentOptionIDs.paypal,
  paymentOptionIDs.paypalCredit,
  paymentOptionIDs.applePay,
  paymentOptionIDs.googlePay
];
var HAS_RAW_PAYMENT_DATA = {};
var VERSION = '1.33.1';

HAS_RAW_PAYMENT_DATA[constants.paymentMethodTypes.googlePay] = true;
HAS_RAW_PAYMENT_DATA[constants.paymentMethodTypes.applePay] = true;

/**
 * @typedef {object} Dropin~cardPaymentMethodPayload
 * @property {string} nonce The payment method nonce, used by your server to charge the card.
 * @property {object} details Additional account details. See a full list of details in the [Hosted Fields client reference](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#~tokenizePayload).
 * @property {string} description A human-readable description.
 * @property {string} type The payment method type, always `CreditCard` when the method requested is a card.
 * @property {object} binData Information about the card based on the bin. Documented {@link Dropin~binData|here}.
 * @property {?boolean} vaulted If present and true, indicates that the payment method refers to a vaulted payment method.
 * @property {?string} deviceData If data collector is configured, the device data property to be used when making a transaction.
 * @property {?boolean} liabilityShifted If 3D Secure is configured, whether or not liability did shift.
 * @property {?boolean} liabilityShiftPossible If 3D Secure is configured, whether or not liability shift is possible.
 * @property {?object} threeDSecureInfo If 3D Secure is configured, the `threeDSecureInfo` documented in the [Three D Secure client reference](http://braintree.github.io/braintree-web/3.85.3/ThreeDSecure.html#~verifyPayload)
 */

/**
 * @typedef {object} Dropin~paypalPaymentMethodPayload
 * @property {string} nonce The payment method nonce, used by your server to charge the PayPal account.
 * @property {?boolean} vaulted If present and true, indicates that the payment method refers to a vaulted payment method.
 * @property {object} details Additional PayPal account details. See a full list of details in the [PayPal client reference](http://braintree.github.io/braintree-web/3.85.3/PayPalCheckout.html#~tokenizePayload).
 * @property {string} type The payment method type, always `PayPalAccount` when the method requested is a PayPal account.
 * @property {?string} deviceData If data collector is configured, the device data property to be used when making a transaction.
 */

/**
 * @typedef {object} Dropin~applePayPaymentMethodPayload
 * @property {string} nonce The payment method nonce, used by your server to charge the Apple Pay provided card.
 * @property {?boolean} vaulted If present and true, indicates that the payment method refers to a vaulted payment method.
 * @property {string} details.cardType Type of card, ex: Visa, Mastercard.
 * @property {string} details.cardHolderName The name of the card holder.
 * @property {string} details.dpanLastTwo Last two digits of card number.
 * @property {external:ApplePayPayment} details.rawPaymentData The raw response back from the Apple Pay flow, which includes billing/shipping address, phone and email if passed in as required parameters.
 * @property {string} description A human-readable description.
 * @property {string} type The payment method type, always `ApplePayCard` when the method requested is an Apple Pay provided card.
 * @property {object} binData Information about the card based on the bin. Documented {@link Dropin~binData|here}.
 * @property {?string} deviceData If data collector is configured, the device data property to be used when making a transaction.
 */

/**
 * @typedef {object} ApplePayPayment An [Apple Pay Payment object](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypayment).
 * @external ApplePayPayment
 * @see {@link https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypayment ApplePayPayment}
 */

/**
 * @typedef {object} Dropin~venmoPaymentMethodPayload
 * @property {string} nonce The payment method nonce, used by your server to charge the Venmo account.
 * @property {?boolean} vaulted If present and true, indicates that the payment method refers to a vaulted payment method.
 * @property {string} details.username The Venmo username.
 * @property {string} type The payment method type, always `VenmoAccount` when the method requested is a Venmo account.
 * @property {?string} deviceData If data collector is configured, the device data property to be used when making a transaction.
 */

/**
 * @typedef {object} Dropin~googlePayPaymentMethodPayload
 * @property {string} nonce The payment method nonce, used by your server to charge the Google Pay card.
 * @property {?boolean} vaulted If present and true, indicates that the payment method refers to a vaulted payment method.
 * @property {string} details.cardType Type of card, ex: Visa, Mastercard.
 * @property {string} details.lastFour The last 4 digits of the card.
 * @property {string} details.lastTwo The last 2 digits of the card.
 * @property {boolean} details.isNetworkTokenized True if the card is network tokenized. A network tokenized card is a generated virtual card with a device-specific account number (DPAN) that is used in place of the underlying source card.
 * @property {string} details.bin First six digits of card number.
 * @property {external:GooglePayPaymentData} details.rawPaymentData The raw response back from the Google Pay flow, which includes shipping address, phone and email if passed in as required parameters.
 * @property {string} type The payment method type, always `AndroidPayCard` when the method requested is a Google Pay Card.
 * @property {object} binData Information about the card based on the bin. Documented {@link Dropin~binData|here}.
 * @property {?string} deviceData If data collector is configured, the device data property to be used when making a transaction.
 */

/**
 * @typedef {object} GooglePayPaymentData A [Google Pay Payment Data object](https://developers.google.com/pay/api/web/object-reference#PaymentData).
 * @external GooglePayPaymentData
 * @see {@link https://developers.google.com/pay/api/web/object-reference#PaymentData PaymentData}
 */

/**
 * @typedef {object} Dropin~binData Information about the card based on the bin.
 * @property {string} commercial Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} countryOfIssuance The country of issuance.
 * @property {string} debit Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} durbinRegulated Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} healthcare Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} issuingBank The issuing bank.
 * @property {string} payroll Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} prepaid Possible values: 'Yes', 'No', 'Unknown'.
 * @property {string} productId The product id.
 */

/**
 * @name Dropin#on
 * @function
 * @param {string} event The name of the event to which you are subscribing.
 * @param {function} handler A callback to handle the event.
 * @description Subscribes a handler function to a named event. `event` should be one of the following:
 *
 *  * [`changeActiveView`](#event:changeActiveView)
 *  * [`paymentMethodRequestable`](#event:paymentMethodRequestable)
 *  * [`noPaymentMethodRequestable`](#event:noPaymentMethodRequestable)
 *  * [`paymentOptionSelected`](#event:paymentOptionSelected)
 *
 *  _Card View Specific Events_
 *  * [`card:binAvailable`](#event:card:binAvailable)
 *  * [`card:blur`](#event:card:blur)
 *  * [`card:cardTypeChange`](#event:card:cardTypeChange)
 *  * [`card:empty`](#event:card:empty)
 *  * [`card:focus`](#event:card:focus)
 *  * [`card:inputSubmitRequest`](#event:card:inputSubmitRequest)
 *  * [`card:notEmpty`](#event:card:notEmpty)
 *  * [`card:validityChange`](#event:card:validityChange)
 *
 *  _3DS Specific Events_
 *  * [`3ds:customer-canceled`](#event:3ds:customer-canceled)
 *  * [`3ds:authentication-modal-render`](#event:3ds:authentication-modal-render)
 *  * [`3ds:authentication-modal-close`](#event:3ds:authentication-modal-close)
 * @returns {void}
 * @example
 * <caption>Dynamically enable or disable your submit button based on whether or not the payment method is requestable</caption>
 * var submitButton = document.querySelector('#submit-button');
 *
 * braintree.dropin.create({
 *   authorization: 'CLIENT_AUTHORIZATION',
 *   container: '#dropin-container'
 * }, function (err, dropinInstance) {
 *   submitButton.addEventListener('click', function () {
 *     dropinInstance.requestPaymentMethod(function (err, payload) {
 *       // Send payload.nonce to your server.
 *     });
 *   });
 *
 *   if (dropinInstance.isPaymentMethodRequestable()) {
 *     // This will be true if you generated the client token
 *     // with a customer ID and there is a saved payment method
 *     // available to tokenize with that customer.
 *     submitButton.removeAttribute('disabled');
 *   }
 *
 *   dropinInstance.on('paymentMethodRequestable', function (event) {
 *     console.log(event.type); // The type of Payment Method, e.g 'CreditCard', 'PayPalAccount'.
 *     console.log(event.paymentMethodIsSelected); // true if a customer has selected a payment method when paymentMethodRequestable fires
 *
 *     submitButton.removeAttribute('disabled');
 *   });
 *
 *   dropinInstance.on('noPaymentMethodRequestable', function () {
 *     submitButton.setAttribute('disabled', true);
 *   });
 * });
 *
 * @example
 * <caption>Automatically submit nonce to server as soon as it becomes available</caption>
 * var submitButton = document.querySelector('#submit-button');
 *
 * braintree.dropin.create({
 *   authorization: 'CLIENT_AUTHORIZATION',
 *   container: '#dropin-container'
 * }, function (err, dropinInstance) {
 *   function sendNonceToServer() {
 *     dropinInstance.requestPaymentMethod(function (err, payload) {
 *       if (err) {
 *         // handle errors
 *       }
 *
 *       // send payload.nonce to your server
 *     });
 *   }
 *
 *   // allows us to still request the payment method manually, such as
 *   // when filling out a credit card form
 *   submitButton.addEventListener('click', sendNonceToServer);
 *
 *   dropinInstance.on('paymentMethodRequestable', function (event) {
 *     // if the nonce is already available (via PayPal authentication
 *     // or by using a stored payment method), we can request the
 *     // nonce right away. Otherwise, we wait for the customer to
 *     // request the nonce by pressing the submit button once they
 *     // are finished entering their credit card details. This is
 *     // particularly important if your credit card form includes a
 *     // postal code input. The `paymentMethodRequestable` event
 *     // could fire before the customer has finished entering their
 *     // postal code. (International postal codes can be as few as 3
 *     // characters in length)
 *     if (event.paymentMethodIsSelected) {
 *       sendNonceToServer();
 *     }
 *   });
 * });
 * @example
 * <caption>Listen for when the customer navigates to different views in Drop-in</caption>
 * braintree.dropin.create({
 *   authorization: 'CLIENT_AUTHORIZATION',
 *   container: '#dropin-container'
 * }, function (err, dropinInstance) {
 *   dropinInstance.on('changeActiveView', function (event) {
 *     // fires when the view changes, such as going from the
 *     // credit card view to the saved payment methods view
 *     event.oldActivePaymentViewId; // card
 *     event.newActivePaymentViewId; // methods
 *   });
 * });
 * @example
 * <caption>Listen on various events from the card view</caption>
 * braintree.dropin.create({
 *   authorization: 'CLIENT_AUTHORIZATION',
 *   container: '#dropin-container'
 * }, function (err, dropinInstance) {
 *   dropinInstance.on('card:focus', function (event) {
 *     // a card field was focussed
 *   });
 *   dropinInstance.on('card:blur', function (event) {
 *     // a card field was blurred
 *   });
 *   dropinInstance.on('card:validityChange', function (event) {
 *     // the card form went from invalid to valid or valid to invalid
 *   });
 * });
 */

/**
 * @name Dropin#off
 * @function
 * @param {string} event The name of the event to which you are unsubscribing.
 * @param {function} handler A callback to unsubscribe from the event.
 * @description Unsubscribes a handler function to a named event.
 * @returns {void}
 * @example
 * <caption>Subscribe and then unsubscribe from event</caption>
 * var callback = function (event) {
 *   // do something
 * };
 * dropinInstance.on('paymentMethodRequestable', callback);
 *
 * // later on
 * dropinInstance.off('paymentMethodRequestable', callback);
 */

/**
 * This event is emitted when the payment method available in Drop-in changes. This includes when the state of Drop-in transitions from having no payment method available to having a payment method available and when the kind of payment method available changes. This event is not fired if there is no payment method available on initialization. To check if there is a payment method requestable on initialization, use {@link Dropin#isPaymentMethodRequestable|`isPaymentMethodRequestable`}.
 * @event Dropin#paymentMethodRequestable
 * @type {Dropin~paymentMethodRequestablePayload}
 */

/**
 * @typedef {object} Dropin~paymentMethodRequestablePayload
 * @description The event payload sent from {@link Dropin#on|`on`} with the {@link Dropin#event:paymentMethodRequestable|`paymentMethodRequestable`} event.
 * @property {string} type The type of payment method that is requestable. Either `CreditCard` or `PayPalAccount`.
 * @property {boolean} paymentMethodIsSelected A property to determine if a payment method is currently selected when the payment method becomes requestable.
 *
 * This will be `true` any time a payment method is visibly selected in the Drop-in UI, such as when PayPal authentication completes or a stored payment method is selected.
 *
 * This will be `false` when {@link Dropin#requestPaymentMethod|`requestPaymentMethod`} can be called, but a payment method is not currently selected. For instance, when a card form has been filled in with valid values, but has not been submitted to be converted into a payment method nonce.
 */

/**
 * This event is emitted when there is no payment method available in Drop-in. This event is not fired if there is no payment method available on initialization. To check if there is a payment method requestable on initialization, use {@link Dropin#isPaymentMethodRequestable|`isPaymentMethodRequestable`}. No payload is available in the callback for this event.
 * @event Dropin#noPaymentMethodRequestable
 */

/**
 * This event is emitted when the customer selects a new payment option type (e.g. PayPal, PayPal Credit, credit card). This event is not emitted when the user changes between existing saved payment methods. Only relevant when accepting multiple payment options.
 * @event Dropin#paymentOptionSelected
 * @type {Dropin~paymentOptionSelectedPayload}
 */

/**
 * This event is emitted when the Drop-in view changes what is presented as the active view.
 * @event Dropin#changeActiveView
 * @type {Dropin~changeActiveView}
 */

/**
 * @typedef {object} Dropin~changeActiveView
 * @description The event payload sent from {@link Dropin#on|`on`} with the {@link Dropin#event:changeActiveView|`changeActiveView`} event.
 * @property {string} previousViewId The id for the previously active view. Possible values are:
 * * `card` - The credit card form view
 * * `paypal` - The PayPal view
 * * `payapCredit` - The PayPal Credit view
 * * `venmo` - The Venmo View
 * * `googlePay` - The Google Pay view
 * * `applePay` - The Apple Pay view
 * * `methods` - The view presenting the available payment methods (already vaulted or tokenized payment methods)
 * * `options` - The view presenting the available payment options (where the customer chooses what payment method option to use). Note, if both the methods view and the options view are presented at the same time, `methods` will be shown as the view id.
 * * `delete-confirmation` - The view where the customer confirms they would like to delete their saved payment method.
 * @property {string} newViewId The id for the new active view. The possible values are the same as `previousViewId`.
 */

/**
 * The underlying [hosted fields `binAvailable` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:binAvailable).
 * @event Dropin#card:binAvailable
 * @type {Dropin~card:binAvailable}
 */

/**
 * The underlying [hosted fields `blur` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:blur).
 * @event Dropin#card:blur
 * @type {Dropin~card:blur}
 */

/**
 * The underlying [hosted fields `cardTypeChange` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:cardTypeChange).
 * @event Dropin#card:cardTypeChange
 * @type {Dropin~card:cardTypeChange}
 */

/**
 * The underlying [hosted fields `empty` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:empty).
 * @event Dropin#card:empty
 * @type {Dropin~card:empty}
 */

/**
 * The underlying [hosted fields `focus` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:focus).
 * @event Dropin#card:focus
 * @type {Dropin~card:focus}
 */

/**
 * The underlying [hosted fields `inputSubmitRequest` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:inputSubmitRequest).
 * @event Dropin#card:inputSubmitRequest
 * @type {Dropin~card:inputSubmitRequest}
 */

/**
 * The underlying [hosted fields `notEmpty` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:notEmpty).
 * @event Dropin#card:notEmpty
 * @type {Dropin~card:notEmpty}
 */

/**
 * The underlying [hosted fields `validityChange` event](http://braintree.github.io/braintree-web/3.85.3/HostedFields.html#event:validityChange).
 * @event Dropin#card:validityChange
 * @type {Dropin~card:validityChange}
 */

/**
 * The underlying [3D Secure `customer-canceled` event](http://braintree.github.io/braintree-web/3.85.3/ThreeDSecure.html#event:customer-canceled).
 * @event Dropin#3ds:customer-canceled
 * @type {Dropin~3ds:customer-canceled}
 */

/**
 * The underlying [3D Secure `authentication-modal-render` event](http://braintree.github.io/braintree-web/3.85.3/ThreeDSecure.html#event:authentication-modal-render).
 * @event Dropin#3ds:authentication-modal-render
 * @type {Dropin~3ds:authentication-modal-render}
 */

/**
 * The underlying [3D Secure `authentication-modal-close` event](http://braintree.github.io/braintree-web/3.85.3/ThreeDSecure.html#event:authentication-modal-close).
 * @event Dropin#3ds:authentication-modal-close
 * @type {Dropin~3ds:authentication-modal-close}
 */

/**
 * @typedef {object} Dropin~paymentOptionSelectedPayload
 * @description The event payload sent from {@link Dropin#on|`on`} with the {@link Dropin#event:paymentOptionSelected|`paymentOptionSelected`} event.
 * @property {string} paymentOption The payment option view selected. Either `card`, `paypal`, or `paypalCredit`.
 */

/**
 * @class
 * @param {object} options For create options, see {@link module:braintree-web-drop-in|dropin.create}.
 * @description <strong>Do not use this constructor directly. Use {@link module:braintree-web-drop-in|dropin.create} instead.</strong>
 * @classdesc This class represents a Drop-in component, that will create a pre-made UI for accepting cards and PayPal on your page. Instances of this class have methods for requesting a payment method and subscribing to events. For more information, see the [Drop-in guide](https://developer.paypal.com/braintree/docs/guides/drop-in/overview/javascript/v3) in the Braintree Developer Docs. To be used in conjunction with the [Braintree Server SDKs](https://developer.paypal.com/braintree/docs/start/hello-server).
 */
function Dropin(options) {
  this._client = options.client;
  this._componentID = uuid();
  this._dropinWrapper = document.createElement('div');
  this._dropinWrapper.id = 'braintree--dropin__' + this._componentID;
  this._dropinWrapper.setAttribute('data-braintree-id', 'wrapper');
  this._dropinWrapper.style.display = 'none';
  this._dropinWrapper.className = 'braintree-loading';
  this._merchantConfiguration = options.merchantConfiguration;

  EventEmitter.call(this);
}

EventEmitter.createChild(Dropin);

Dropin.prototype._initialize = function (callback) {
  var localizedStrings, localizedHTML;
  var self = this;
  var container = self._merchantConfiguration.container || self._merchantConfiguration.selector;

  if (!container) {
    analytics.sendEvent(self._client, 'configuration-error');
    callback(new DropinError('options.container is required.'));

    return;
  } else if (self._merchantConfiguration.container && self._merchantConfiguration.selector) {
    analytics.sendEvent(self._client, 'configuration-error');
    callback(new DropinError('Must only have one options.selector or options.container.'));

    return;
  }

  if (typeof container === 'string') {
    container = document.querySelector(container);
  }

  if (!container || container.nodeType !== 1) {
    analytics.sendEvent(self._client, 'configuration-error');
    callback(new DropinError('options.selector or options.container must reference a valid DOM node.'));

    return;
  }

  if (container.innerHTML.trim()) {
    analytics.sendEvent(self._client, 'configuration-error');
    callback(new DropinError('options.selector or options.container must reference an empty DOM node.'));

    return;
  }

  // Backfill with `en`
  self._strings = assign({}, translations.en);
  if (self._merchantConfiguration.locale) {
    localizedStrings = translations[self._merchantConfiguration.locale] || translations[self._merchantConfiguration.locale.split('_')[0]];
    // Fill `strings` with `localizedStrings` that may exist
    self._strings = assign(self._strings, localizedStrings);
  }

  if (!isUtf8()) {
    // non-utf-8 encodings often don't support the bullet character
    self._strings.endingIn = self._strings.endingIn.replace(/•/g, '*');
  }

  if (self._merchantConfiguration.translations) {
    Object.keys(self._merchantConfiguration.translations).forEach(function (key) {
      self._strings[key] = sanitizeHtml(self._merchantConfiguration.translations[key]);
    });
  }

  localizedHTML = Object.keys(self._strings).reduce(function (result, stringKey) {
    var stringValue = self._strings[stringKey];

    return result.replace(RegExp('{{' + stringKey + '}}', 'g'), stringValue);
  }, mainHTML);

  self._dropinWrapper.innerHTML = svgHTML + localizedHTML;
  container.appendChild(self._dropinWrapper);

  self._model = new DropinModel({
    client: self._client,
    container: container,
    componentID: self._componentID,
    merchantConfiguration: self._merchantConfiguration
  });

  self._injectStylesheet();

  self._model.initialize().then(function () {
    self._model.on('cancelInitialization', function (err) {
      self._dropinWrapper.innerHTML = '';
      analytics.sendEvent(self._client, 'load-error');
      callback(err);
    });

    self._model.on('asyncDependenciesReady', function () {
      if (self._model.hasAtLeastOneAvailablePaymentOption()) {
        analytics.sendEvent(self._client, 'appeared');
        self._disableErroredPaymentMethods();

        self._handleAppSwitch();

        self._model.confirmDropinReady();

        callback(null, self);
      } else {
        self._model.cancelInitialization(new DropinError('All payment options failed to load.'));
      }
    });

    PASS_THROUGH_EVENTS.forEach(function (eventName) {
      self._model.on(eventName, function (event) {
        self._emit(eventName, event);
      });
    });

    return self._setUpDependenciesAndViews();
  }).catch(function (err) {
    self.teardown().then(function () {
      callback(err);
    });
  });
};

/**
 * Modify your configuration initially set in {@link module:braintree-web-drop-in|`dropin.create`}.
 *
 * If `updateConfiguration` is called after a user completes the PayPal authorization flow, any PayPal accounts not stored in the Vault record will be removed.
 * @public
 * @param {string} property The top-level property to update. Either `paypal`, `paypalCredit`, `applePay`, or `googlePay`.
 * @param {string} key The key of the property to update, such as `amount` or `currency`.
 * @param {any} value The value of the property to update. Must be the type of the property specified in {@link module:braintree-web-drop-in|`dropin.create`}.
 * @returns {void}
 * @example
 * dropinInstance.updateConfiguration('paypal', 'amount', '10.00');
 */
Dropin.prototype.updateConfiguration = function (property, key, value) {
  var view;

  if (UPDATABLE_CONFIGURATION_OPTIONS.indexOf(property) === -1) {
    return;
  }

  if (property === 'threeDSecure') {
    if (this._threeDSecure) {
      this._threeDSecure.updateConfiguration(key, value);
    }

    return;
  }

  view = this._mainView.getView(property);

  if (!view) {
    return;
  }

  view.updateConfiguration(key, value);

  if (UPDATABLE_CONFIGURATION_OPTIONS_THAT_REQUIRE_UNVAULTED_PAYMENT_METHODS_TO_BE_REMOVED.indexOf(property) === -1) {
    return;
  }

  this._removeUnvaultedPaymentMethods(function (paymentMethod) {
    return paymentMethod.type === constants.paymentMethodTypes[property];
  });
  this._navigateToInitialView();
};

/**
 * Get a list of the available payment methods presented to the user. This is useful for knowing if a paricular payment option was presented to a customer that is browser dependant such as Apple Pay, Google Pay and Venmo. Returns an array of strings. Possible values:
 * * `applePay`
 * * `card`
 * * `googlePay`
 * * `paypalCredit`
 * * `paypal`
 * * `venmo`
 *
 * @public
 * @returns {string[]} An array of possible payment options.
 * @example
 * var paymentOptions = dropinInstance.getAvailablePaymentOptions(); // ['card', 'venmo', 'paypal']
 *
 * if (paymentOptions.includes('venmo')) {
 *   // special logic for when venmo is displayed
 * }
 */
Dropin.prototype.getAvailablePaymentOptions = function () {
  return this._model.supportedPaymentOptions;
};

/**
 * Removes the currently selected payment method and returns the customer to the payment options view. Does not remove vaulted payment methods.
 * @public
 * @returns {void}
 * @example
 * dropinInstance.requestPaymentMethod(function (requestPaymentMethodError, payload) {
 *   if (requestPaymentMethodError) {
 *     // handle errors
 *     return;
 *   }
 *
 *   functionToSendNonceToServer(payload.nonce, function (transactionError, response) {
 *     if (transactionError) {
 *       // transaction sale with selected payment method failed
 *       // clear the selected payment method and add a message
 *       // to the checkout page about the failure
 *       dropinInstance.clearSelectedPaymentMethod();
 *       divForErrorMessages.textContent = 'my error message about entering a different payment method.';
 *     } else {
 *       // redirect to success page
 *     }
 *   });
 * });
 */
Dropin.prototype.clearSelectedPaymentMethod = function () {
  this._removeUnvaultedPaymentMethods();
  this._model.removeActivePaymentMethod();

  if (this._model.getPaymentMethods().length === 0) {
    this._navigateToInitialView();

    return;
  }

  this._mainView.showLoadingIndicator();

  this._model.refreshPaymentMethods().then(function () {
    this._navigateToInitialView();
    this._mainView.hideLoadingIndicator();
  }.bind(this));
};

Dropin.prototype._setUpDataCollector = function () {
  var self = this;
  var config = assign({}, self._merchantConfiguration.dataCollector, {client: self._client});

  this._dataCollector = new DataCollector(config);

  this._dataCollector.initialize().then(function () {
    self._model.asyncDependencyReady('dataCollector');
  }).catch(function (err) {
    self._model.cancelInitialization(new DropinError({
      message: 'Data Collector failed to set up.',
      braintreeWebError: err
    }));
  });
};

Dropin.prototype._setUpThreeDSecure = function () {
  var self = this;

  this._threeDSecure = new ThreeDSecure(this._client, this._model);

  this._threeDSecure.initialize().then(function () {
    self._model.asyncDependencyReady('threeDSecure');
  }).catch(function (err) {
    self._model.cancelInitialization(new DropinError({
      message: '3D Secure failed to set up.',
      braintreeWebError: err
    }));
  });
};

Dropin.prototype._setUpDependenciesAndViews = function () {
  if (this._merchantConfiguration.dataCollector) {
    this._setUpDataCollector();
  }

  if (this._merchantConfiguration.threeDSecure) {
    this._setUpThreeDSecure();
  }

  this._mainView = new MainView({
    client: this._client,
    element: this._dropinWrapper,
    model: this._model,
    strings: this._strings
  });
};

Dropin.prototype._removeUnvaultedPaymentMethods = function (filter) {
  filter = filter || function () { return true; };

  this._model.getPaymentMethods().forEach(function (paymentMethod) {
    if (filter(paymentMethod) && !paymentMethod.vaulted) {
      this._model.removePaymentMethod(paymentMethod);
    }
  }.bind(this));
};

Dropin.prototype._navigateToInitialView = function () {
  var isOnMethodsView = this._mainView.primaryView.ID === paymentMethodsViewID;

  if (!isOnMethodsView) {
    return;
  }

  if (this._model.hasPaymentMethods()) {
    return;
  }

  this._mainView.setPrimaryView(this._model.getInitialViewId());
};

Dropin.prototype._supportsPaymentOption = function (paymentOption) {
  return this._model.supportedPaymentOptions.indexOf(paymentOption) !== -1;
};

Dropin.prototype._disableErroredPaymentMethods = function () {
  var paymentMethodOptionsElements;
  var failedDependencies = Object.keys(this._model.failedDependencies);

  if (failedDependencies.length === 0) {
    return;
  }

  paymentMethodOptionsElements = this._mainView.getOptionsElements();

  failedDependencies.forEach(function (paymentMethodId) {
    var element = paymentMethodOptionsElements[paymentMethodId];
    var div = element.div;
    var clickHandler = element.clickHandler;
    var error = this._model.failedDependencies[paymentMethodId];
    var errorMessageDiv = div.querySelector('.braintree-option__disabled-message');

    classList.add(div, 'braintree-disabled');
    div.removeEventListener('click', clickHandler);
    errorMessageDiv.innerHTML = constants.errors.DEVELOPER_MISCONFIGURATION_MESSAGE;
    console.error(error); // eslint-disable-line no-console
  }.bind(this));
};

Dropin.prototype._sendVaultedPaymentMethodAppearAnalyticsEvents = function () {
  var i, type;
  var typesThatSentAnEvent = {};
  var paymentMethods = this._model._paymentMethods;

  for (i = 0; i < paymentMethods.length; i++) {
    type = paymentMethods[i].type;

    if (type in typesThatSentAnEvent) {
      // prevents us from sending the analytic multiple times
      // for the same payment method type
      continue;
    }

    typesThatSentAnEvent[type] = true;

    analytics.sendEvent(this._client, 'vaulted-' + constants.analyticsKinds[type] + '.appear');
  }
};

Dropin.prototype._handleAppSwitch = function () {
  if (this._model.appSwitchError) {
    this._mainView.setPrimaryView(this._model.appSwitchError.id);
    this._model.reportError(this._model.appSwitchError.error);
  } else if (this._model.appSwitchPayload) {
    this._model.addPaymentMethod(this._model.appSwitchPayload);
  } else {
    this._sendVaultedPaymentMethodAppearAnalyticsEvents();
  }
};

/**
 * Requests a payment method object which includes the payment method nonce used by by the [Braintree Server SDKs](https://developer.paypal.com/braintree/docs/start/hello-server).
 *
 * If a payment method is not available, an error will appear in the UI. When a callback is used, an error will be passed to it. If no callback is used, the returned Promise will be rejected with an error.
 * @public
 * @param {object} [options] All options for requesting a payment method.
 * @param {object} [options.threeDSecure] Any of the options in the [Braintree 3D Secure client reference](https://braintree.github.io/braintree-web/3.85.3/ThreeDSecure.html#verifyCard) except for `nonce`, `bin`, and `onLookupComplete`. If `amount` is provided, it will override the value of `amount` in the [3D Secure create options](module-braintree-web-drop-in.html#~threeDSecureOptions). The more options provided, the more likely the customer will not need to answer a 3DS challenge. When 3DS is enabled, both credit cards and non-network tokenized Google Pay cards will perform verfication. The recommended fields for achieving a 3DS v2 verification are:
 * * `email`
 * * `mobilePhoneNumber`
 * * `billingAddress`
 *
 * For an example of verifying 3D Secure within Drop-in, [check out this codepen](https://codepen.io/braintree/pen/KjWqGx).
 * @param {callback} [callback] May be used as the only parameter in requestPaymentMethod if no `options` are provided. The first argument will be an error if no payment method is available and will otherwise be null. The second argument will be an object containing a payment method nonce; either a {@link Dropin~cardPaymentMethodPayload|cardPaymentMethodPayload}, a {@link Dropin~paypalPaymentMethodPayload|paypalPaymentMethodPayload}, a {@link Dropin~venmoPaymentMethodPayload|venmoPaymentMethodPayload}, a {@link Dropin~googlePayPaymentMethodPayload|googlePayPaymentMethodPayload} or an {@link Dropin~applePayPaymentMethodPayload|applePayPaymentMethodPayload}. If no callback is provided, `requestPaymentMethod` will return a promise.
 * @returns {(void|Promise)} Returns a promise if no callback is provided.
 * @example <caption>Requesting a payment method</caption>
 * var form = document.querySelector('#my-form');
 * var hiddenNonceInput = document.querySelector('#my-nonce-input');
 *
 * form.addEventListener('submit', function (event) {
 *  event.preventDefault();
 *
 *  dropinInstance.requestPaymentMethod(function (err, payload) {
 *    if (err) {
 *      // handle error
 *      return;
 *    }
 *    hiddenNonceInput.value = payload.nonce;
 *    form.submit();
 *  });
 * });
 * @example <caption>Requesting a payment method with data collector</caption>
 * var form = document.querySelector('#my-form');
 * var hiddenNonceInput = document.querySelector('#my-nonce-input');
 * var hiddenDeviceDataInput = document.querySelector('#my-device-data-input');
 *
 * form.addEventListener('submit', function (event) {
 *  event.preventDefault();
 *
 *  dropinInstance.requestPaymentMethod(function (err, payload) {
 *    if (err) {
 *      // handle error
 *      return;
 *    }
 *    hiddenNonceInput.value = payload.nonce;
 *    hiddenDeviceDataInput.value = payload.deviceData;
 *    form.submit();
 *  });
 * });
 *
 * @example <caption>Requesting a payment method with 3D Secure</caption>
 * var form = document.querySelector('#my-form');
 * var hiddenNonceInput = document.querySelector('#my-nonce-input');
 *
 * form.addEventListener('submit', function (event) {
 *  event.preventDefault();
 *
 *  dropinInstance.requestPaymentMethod(function (err, payload) {
 *    if (err) {
 *      // Handle error
 *      return;
 *    }
 *
 *    if (payload.liabilityShifted || (payload.type !== 'CreditCard' && payload.type !== 'AndroidPayCard')) {
 *      hiddenNonceInput.value = payload.nonce;
 *      form.submit();
 *    } else {
 *      // Decide if you will force the user to enter a different payment method
 *      // if liability was not shifted
 *      dropinInstance.clearSelectedPaymentMethod();
 *    }
 *  });
 * });
 */
Dropin.prototype.requestPaymentMethod = function (options) {
  // NEXT_MAJOR_VERSION
  // what should happen when this method is called while a payment
  // method is already being requested? Should it error? Should
  // they both resolve with the payload from the original request?
  // this is only important because when doing 3ds, multiple
  // requests in quick succession can get you into a state
  // where it errors because the 3ds verification is called twice
  var self = this;

  options = options || {};

  return this._mainView.requestPaymentMethod().then(function (payload) {
    if (self._shouldPerformThreeDSecureVerification(payload)) {
      self._mainView.showLoadingIndicator();

      return self._threeDSecure.verify(payload, options.threeDSecure).then(function (newPayload) {
        payload.nonce = newPayload.nonce;
        payload.liabilityShifted = newPayload.liabilityShifted;
        payload.liabilityShiftPossible = newPayload.liabilityShiftPossible;
        payload.threeDSecureInfo = newPayload.threeDSecureInfo;

        self._mainView.hideLoadingIndicator();

        return payload;
      }).catch(function (err) {
        self.clearSelectedPaymentMethod();

        return self._model.refreshPaymentMethods().then(function () {
          self._mainView.hideLoadingIndicator();

          return Promise.reject(new DropinError({
            message: 'Something went wrong during 3D Secure authentication. Please try again.',
            braintreeWebError: err
          }));
        });
      });
    }

    return payload;
  }).then(function (payload) {
    if (self._dataCollector) {
      payload.deviceData = self._dataCollector.getDeviceData();
    }

    return payload;
  }).then(function (payload) {
    return formatPaymentMethodPayload(payload);
  });
};

Dropin.prototype._shouldPerformThreeDSecureVerification = function (payload) {
  if (!this._threeDSecure) {
    return false;
  }

  if (payload.liabilityShifted != null) {
    return false;
  }

  if (payload.type === constants.paymentMethodTypes.card) {
    return true;
  }

  if (payload.type === constants.paymentMethodTypes.googlePay && payload.details.isNetworkTokenized === false) {
    return true;
  }

  return false;
};

Dropin.prototype._removeStylesheet = function () {
  var stylesheet = document.getElementById(constants.STYLESHEET_ID);

  if (stylesheet) {
    stylesheet.parentNode.removeChild(stylesheet);
  }
};

Dropin.prototype._injectStylesheet = function () {
  var assetsUrl;
  var loadStylesheetOptions = {
    id: constants.STYLESHEET_ID
  };

  if (document.getElementById(constants.STYLESHEET_ID)) { return; }

  assetsUrl = this._client.getConfiguration().gatewayConfiguration.assetsUrl;
  loadStylesheetOptions.href = assetsUrl + '/web/dropin/' + VERSION + '/css/dropin.css';

  if (this._model.isInShadowDom) {
    // if Drop-in is in the shadow DOM, put the
    // style sheet in the shadow DOM node instead of
    // in the head of the document
    loadStylesheetOptions.container = this._model.rootNode;
  }

  assets.loadStylesheet(loadStylesheetOptions);
};

/**
 * Cleanly remove anything set up by {@link module:braintree-web-drop-in|dropin.create}. This may be be useful in a single-page app.
 * @public
 * @param {callback} [callback] Called on completion, containing an error if one occurred. No data is returned if teardown completes successfully. If no callback is provided, `teardown` will return a promise.
 * @returns {(void|Promise)} Returns a promise if no callback is provided.
 */
Dropin.prototype.teardown = function () {
  var teardownError;
  var promise = Promise.resolve();
  var self = this;

  this._removeStylesheet();

  if (this._mainView) {
    promise.then(function () {
      return self._mainView.teardown().catch(function (err) {
        teardownError = err;
      });
    });
  }

  if (this._dataCollector) {
    promise.then(function () {
      return this._dataCollector.teardown().catch(function (error) {
        teardownError = new DropinError({
          message: 'Drop-in errored tearing down Data Collector.',
          braintreeWebError: error
        });
      });
    }.bind(this));
  }

  if (this._threeDSecure) {
    promise.then(function () {
      return this._threeDSecure.teardown().catch(function (error) {
        teardownError = new DropinError({
          message: 'Drop-in errored tearing down 3D Secure.',
          braintreeWebError: error
        });
      });
    }.bind(this));
  }

  return promise.then(function () {
    return self._removeDropinWrapper();
  }).then(function () {
    if (teardownError) {
      return Promise.reject(teardownError);
    }

    return Promise.resolve();
  });
};

/**
 * Returns a boolean indicating if a payment method is available through {@link Dropin#requestPaymentMethod|requestPaymentMethod}. Particularly useful for detecting if using a client token with a customer ID to show vaulted payment methods.
 * @public
 * @returns {Boolean} True if a payment method is available, otherwise false.
 */
Dropin.prototype.isPaymentMethodRequestable = function () {
  return this._model.isPaymentMethodRequestable();
};

Dropin.prototype._removeDropinWrapper = function () {
  this._dropinWrapper.parentNode.removeChild(this._dropinWrapper);

  return Promise.resolve();
};

function formatPaymentMethodPayload(paymentMethod) {
  var formattedPaymentMethod = {
    nonce: paymentMethod.nonce,
    details: paymentMethod.details,
    type: paymentMethod.type
  };

  if (paymentMethod.vaulted != null) {
    formattedPaymentMethod.vaulted = paymentMethod.vaulted;
  }

  if (paymentMethod.type === constants.paymentMethodTypes.card) {
    formattedPaymentMethod.description = paymentMethod.description;
  }

  if (paymentMethod.type in HAS_RAW_PAYMENT_DATA) {
    formattedPaymentMethod.details.rawPaymentData = paymentMethod.rawPaymentData;
  }

  if (typeof paymentMethod.liabilityShiftPossible === 'boolean') {
    formattedPaymentMethod.liabilityShifted = paymentMethod.liabilityShifted;
    formattedPaymentMethod.liabilityShiftPossible = paymentMethod.liabilityShiftPossible;
  }

  if (paymentMethod.threeDSecureInfo) {
    formattedPaymentMethod.threeDSecureInfo = paymentMethod.threeDSecureInfo;
  }

  if (paymentMethod.deviceData) {
    formattedPaymentMethod.deviceData = paymentMethod.deviceData;
  }

  if (paymentMethod.binData) {
    formattedPaymentMethod.binData = paymentMethod.binData;
  }

  return formattedPaymentMethod;
}

module.exports = wrapPrototype(Dropin);
