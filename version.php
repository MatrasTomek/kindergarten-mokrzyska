<?php
echo 'PHP ' . PHP_VERSION . '<br>ext-mongodb ' . (phpversion('mongodb') ?: 'BRAK');