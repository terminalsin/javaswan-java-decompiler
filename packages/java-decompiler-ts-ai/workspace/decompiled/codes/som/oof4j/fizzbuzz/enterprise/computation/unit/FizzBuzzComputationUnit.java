package codes.som.oof4j.fizzbuzz.enterprise.computation.unit;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;
import codes.som.oof4j.fizzbuzz.enterprise.results.internal.FizzBuzzResultImpl;

public class FizzBuzzComputationUnit {
    private final int iteration;

    public FizzBuzzComputationUnit(int iteration) {
        this.iteration = iteration;
    }

    public FizzBuzzResult calculate() {
        Flags flags = new Flags();
        FizzBuzzRuleApplicator.applyAllRules(this.iteration, flags);
        String message = FizzBuzzComputationUnitLookupTableEntry.values()[flags.getValue()].toString();
        if (message == null) {
            message = String.valueOf(this.iteration);
        }
        return new FizzBuzzResultImpl(this.iteration, message);
    }
}