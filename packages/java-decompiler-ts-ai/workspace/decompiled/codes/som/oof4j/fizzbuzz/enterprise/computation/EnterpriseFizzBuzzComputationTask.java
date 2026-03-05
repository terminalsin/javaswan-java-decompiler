package codes.som.oof4j.fizzbuzz.enterprise.computation;

import codes.som.oof4j.fizzbuzz.enterprise.results.internal.AbstractFizzBuzzResultPublisherImpl;

public class EnterpriseFizzBuzzComputationTask extends AbstractFizzBuzzResultPublisherImpl implements Runnable {
    private final int iterations;

    public EnterpriseFizzBuzzComputationTask(int iterations) {
        this.iterations = iterations;
    }

    public void run() {
        execute();
    }

    private void execute() {
        for (int iteration = 1; iteration <= this.iterations; iteration++) {
            unit.FizzBuzzComputationUnit unit = new unit.FizzBuzzComputationUnit(iteration);
            this.publishResult(unit.calculate());
        }
    }
}