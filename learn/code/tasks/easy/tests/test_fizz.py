from fizz import fizz


def test_a_number():
    assert fizz(1) == "1"


def test_three():
    assert fizz(3) == "Fizz"


def test_five():
    assert fizz(5) == "Buzz"


def test_fifteen():
    assert fizz(15) == "FizzBuzz"


def test_zero_is_fizzbuzz():
    assert fizz(0) == "FizzBuzz"
