(function() {
	if (window.mingy_addon) {
		return;
	}
	var cmdline = $('<input class="sender-box" style="position: fixed; left: 0px; top: 0px; width: 500px;">');
	var history_cmds = [];
	var select_index = -1;
	cmdline.keydown(function(e) {
		if (e.which == 27) { // ESC
			cmdline.detach();
			e.preventDefault();
		} else if (e.which == 13) { // ENTER
			cmdline.detach();
			send_command();
			e.preventDefault();
		} else if (e.which == 38) { // UP
			if (select_index > 0) {
				cmdline.val(history_cmds[--select_index]);
				cmdline.select();
				cmdline.focus();
				e.preventDefault();
			}
		} else if (e.which == 40) { // DOWN
			if (select_index < history_cmds.length - 1) {
				cmdline.val(history_cmds[++select_index]);
				cmdline.select();
				cmdline.focus();
				e.preventDefault();
			}
		}
	});
	function send_command() {
		var cmd = $.trim(cmdline.val());
		if (cmd == '') {
			return;
		}
		if (history_cmds.length == 0
				|| history_cmds[history_cmds.length - 1] != cmd) {
			history_cmds.push(cmd);
			if (history_cmds.length > 20) {
				history_cmds = history_cmds.slice(-20);
			}
		}
		SendCommand(cmd);
	}
	$(document).keydown(
			function(e) {
				if (e.which == 112) { // F1
					SendCommand('eq 9wow13462cb;perform force.xi;perform dodge.power;perform sword.wu');
					e.preventDefault();
				} else if (e.which == 113) { // F2
					SendCommand('eq zsko12f23aa;perform force.xi;perform dodge.power;perform blade.chan;eq 9wow13462cb');
					e.preventDefault();
				} else if (e.which == 114) { // F3
					SendCommand('perform force.xi;perform dodge.power;eq twkw1558183;perform whip.chan;eq 9wow13462cb');
					e.preventDefault();
				} else if (e.which == 115) { // F4
					SendCommand('eq 9wow13462cb;perform force.xi;perform sword.poqi');
					e.preventDefault();
				} else if (e.which == 118) { // F7
					SendCommand('eq 86q7155246a;eq 8j7n151819c;eq 9f1k1560253;eq sg9w14d7dca');
					e.preventDefault();
				} else if (e.which == 119) { // F8
					SendCommand('eq 603z155852b;eq 38hd14d7d37;eq q0ui10f5a1d;eq lhc313bbbf4');
					e.preventDefault();
				} else if (e.which == 120) { // F9
					SendCommand('jh fam 0 start;go west;go west;go north;go enter;go west;lianxi yunlongbian');
					e.preventDefault();
				} else if (e.which == 121) { // F10
					SendCommand('jh fam 0 start;go west;go west;go west;go west;eq dkdi128460d;wa');
					e.preventDefault();
				} else if (e.which == 97) {
					SendCommand('go southwest');
				} else if (e.which == 98) {
					SendCommand('go south');
				} else if (e.which == 99) {
					SendCommand('go southeast');
				} else if (e.which == 100) {
					SendCommand('go west');
				} else if (e.which == 102) {
					SendCommand('go east');
				} else if (e.which == 103) {
					SendCommand('go northwest');
				} else if (e.which == 104) {
					SendCommand('go north');
				} else if (e.which == 105) {
					SendCommand('go northeast');
				} else if (!e.isDefaultPrevented() && e.which == 13) { // ENTER
					$('body').append(cmdline);
					cmdline.css('left', ($('.content-message').offset().left) + 'px');
					cmdline.css('top', ($('.content-message').offset().top) + 'px');
					if (history_cmds.length > 0) {
						select_index = history_cmds.length - 1;
						cmdline.val(history_cmds[select_index]);
						cmdline.select();
						cmdline.focus();
					} else {
						cmdline.val('');
						cmdline.focus();
					}
					e.preventDefault();
				}
				return true;
			});
	window.mingy_addon = 1;
	ReceiveMessage('<red>addon loaded</red>');
})();