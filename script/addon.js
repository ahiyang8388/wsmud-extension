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
					SendCommand('perform force.xi;perform sword.wu;perform sword.poqi');
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