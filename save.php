<?php 

$server      ="localhost";
$name    ="root";
$password    ="";
$dbname      ="BMT_Data";

$con = mysqli_connect($server, $username, $password, $BMT_Data);

if(!$con)
{
    echo "Not Connected";
}
else 
{
    echo "Connected Us Successfully";
}

?>
