<h2>Login</h2>

{{#ERROR}}<div class="error">{{ERROR}}</div>{{/ERROR}}

<form method="post">
    <table>
        <tr>
            <td><label for="r_email">Email:</label></td>
            <td><input id="r_email" name="email" value="{{EMAIL:h}}" /></td>
        </tr>
        <tr>
            <td><label for="r_pw">Password:</label></td>
            <td><input id="r_pw" name="pw" type="password" /></td>
        </tr>
    </table>
    <input type="submit" value="Login" />
    <span class="legend">(A cookie will be stored on your computer to keep your session open.)</span>
</form>

<a href="/register">Register</a> &middot; <a href="/account/reset">Lost your password?</a>
