package codes.som.oof4j.fizzbuzz.enterprise.results.internal;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;

public class FizzBuzzResultImpl implements FizzBuzzResult {
    private final int number;
    private final String representation;

    public FizzBuzzResultImpl(int number, String representation) {
        this.number = number;
        this.representation = representation;
    }

    public int getNumber() {
        return this.number;
    }

    public String getAsString() {
        return this.representation;
    }
}